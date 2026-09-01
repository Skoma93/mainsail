<template>
    <v-dialog
        v-model="showDialog"
        :max-width="400"
        content-class="overflow-x-hidden"
        @click:outside="closeDialog"
        @keydown.esc="closeDialog">
        <v-card>
            <start-print-dialog-thumbnail :file="file" :current-path="currentPath" />
            <v-card-title class="text-h5">{{ $t('Dialogs.StartPrint.Headline') }}</v-card-title>
            <v-card-text class="pb-0">
                <p class="body-2">
                    {{ question }}
                </p>
                <div v-if="flowModesAvailable">
                    <div class="text-caption mb-1">{{ $t('Dialogs.StartPrint.PrintMode') }}</div>
                    <v-btn-toggle v-model="selectedFlowMode" mandatory dense class="d-flex">
                        <v-btn
                            v-for="item in flowModeItems"
                            :key="item.value"
                            :value="item.value"
                            small
                            class="flex-grow-1"
                            @click="selectedFlowMode = item.value">
                            {{ item.text }}
                        </v-btn>
                    </v-btn-toggle>
                    <v-btn
                        block
                        small
                        outlined
                        class="mt-2"
                        :color="adaptiveMesh ? 'primary' : undefined"
                        :disabled="!adaptiveMeshAvailable"
                        @click="adaptiveMesh = !adaptiveMesh">
                        <v-icon left small>{{ adaptiveMesh ? mdiCheckboxMarked : mdiCheckboxBlankOutline }}</v-icon>
                        {{ $t('Dialogs.StartPrint.AdaptiveBedMesh') }}
                    </v-btn>
                </div>
                <v-alert v-if="flowModeRequirement" dense text type="warning" class="mt-3 mb-0">
                    {{ flowModeRequirement }}
                </v-alert>
            </v-card-text>
            <start-print-dialog-afc v-if="afcExists" :file="file" />
            <start-print-dialog-mmu v-else-if="existsMmu" :file="file" />
            <start-print-dialog-spoolman v-else-if="existsSpoolman" :file="file" />
            <start-print-dialog-timelapse v-if="existsTimelapse" />
            <v-divider v-if="showDivider" class="my-0" />
            <v-card-actions>
                <v-spacer />
                <v-btn text @click="closeDialog">{{ $t('Buttons.Cancel') }}</v-btn>
                <v-btn
                    color="primary"
                    text
                    :disabled="startDisabled"
                    :loading="starting"
                    @click="startPrint(file.filename)">
                    {{ $t('Dialogs.StartPrint.Print') }}
                </v-btn>
            </v-card-actions>
        </v-card>
    </v-dialog>
</template>

<script lang="ts">
import { Component, Mixins, Prop, VModel, Watch } from 'vue-property-decorator'
import BaseMixin from '@/components/mixins/base'
import { FileStateGcodefile } from '@/store/files/types'
import SettingsRow from '@/components/settings/SettingsRow.vue'
import { mdiCheckboxBlankOutline, mdiCheckboxMarked, mdiPrinter3d } from '@mdi/js'
import { ServerSpoolmanStateSpool } from '@/store/server/spoolman/types'
import AfcMixin from '@/components/mixins/afc'

@Component({
    components: { SettingsRow },
})
export default class StartPrintDialog extends Mixins(BaseMixin, AfcMixin) {
    mdiPrinter3d = mdiPrinter3d
    mdiCheckboxBlankOutline = mdiCheckboxBlankOutline
    mdiCheckboxMarked = mdiCheckboxMarked

    @VModel({ type: Boolean }) showDialog!: boolean
    @Prop({ required: true, default: '' }) readonly currentPath!: string
    @Prop({ required: true }) readonly file!: FileStateGcodefile

    selectedFlowMode = 'NORMAL'
    adaptiveMesh = false
    starting = false

    get flowModesAvailable(): boolean {
        return Boolean(this.$store.state.printer?.flow_idex_modes)
    }

    get flowModeItems() {
        return ['NORMAL', 'PARALLEL', 'MIRROR', 'BACKUP'].map((value) => ({
            value,
            text: this.$t(`Panels.ToolheadControlPanel.FlowModes.${value}`),
        }))
    }

    get synchronizedMode(): boolean {
        return ['PARALLEL', 'MIRROR'].includes(this.selectedFlowMode)
    }

    get adaptiveMeshAvailable(): boolean {
        return Boolean(this.$store.state.printer?.bed_mesh && this.$store.state.printer?.exclude_object)
    }

    get adaptiveBedStabilization(): boolean {
        return this.$store.state.gui.control.adaptiveBedStabilization ?? true
    }

    get flowModeRequirement(): string | null {
        if (this.synchronizedMode && !this.file?.first_layer_height)
            return this.$t('Dialogs.StartPrint.FirstLayerHeightRequired').toString()
        if (this.adaptiveMesh && !this.file?.first_layer_bed_temp)
            return this.$t('Dialogs.StartPrint.AdaptiveTemperaturesRequired').toString()
        return null
    }

    get startDisabled(): boolean {
        return this.printerIsPrinting || !this.klipperReadyForGui || this.starting || Boolean(this.flowModeRequirement)
    }

    get existsMmu() {
        return this.$store.state.printer.mmu?.enabled && this.$store.state.printer.mmu?.gate !== -2
    }

    get existsSpoolman() {
        return this.moonrakerComponents.includes('spoolman')
    }

    get existsTimelapse() {
        return this.moonrakerComponents.includes('timelapse')
    }

    get showDivider() {
        return this.afcExists || this.existsSpoolman || this.existsTimelapse
    }

    get active_spool(): ServerSpoolmanStateSpool | null {
        return this.$store.state.server.spoolman.active_spool ?? null
    }

    get question() {
        if (this.active_spool)
            return this.$t('Dialogs.StartPrint.DoYouWantToStartFilenameFilament', {
                filename: this.file?.filename ?? 'unknown',
            })

        return this.$t('Dialogs.StartPrint.DoYouWantToStartFilename', { filename: this.file?.filename ?? 'unknown' })
    }

    async startPrint(filename = '') {
        filename = (this.currentPath + '/' + filename).substring(1)
        this.starting = true
        try {
            if (this.flowModesAvailable) {
                let script = `SET_FLOW_MODE MODE=${this.selectedFlowMode} DEFER=1`
                if (this.synchronizedMode) script += ` FIRST_LAYER_HEIGHT=${this.file.first_layer_height}`
                if (this.adaptiveMesh) {
                    script += ` ADAPTIVE_MESH=1 ADAPTIVE_BED_TEMP=${this.file.first_layer_bed_temp}`
                    if (!this.adaptiveBedStabilization) script += ' ADAPTIVE_BED_STABILIZATION_TIME=0'
                }
                await this.$socket.emitAndWait('printer.gcode.script', { script })
            }
            this.closeDialog()
            this.$socket.emit('printer.print.start', { filename: filename }, { action: 'switchToDashboard' })
        } finally {
            this.starting = false
        }
    }

    closeDialog() {
        this.showDialog = false
    }

    @Watch('showDialog')
    onShowDialogChanged(newVal: boolean) {
        if (!newVal) return
        this.selectedFlowMode = this.$store.state.printer?.flow_idex_modes?.mode ?? 'NORMAL'
        this.adaptiveMesh = false
        if (!this.file || this.file.metadataPulled || this.file.metadataRequested) return

        const fullPath = ['gcodes']
        if (this.currentPath) fullPath.push(this.currentPath.replace(/^\/+/, ''))
        fullPath.push(this.file.filename)
        this.$store.dispatch('files/requestMetadata', [{ filename: fullPath.join('/') }])
    }
}
</script>
