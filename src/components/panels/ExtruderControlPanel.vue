<template>
    <panel
        v-if="showPanel"
        :icon="mdiPrinter3dNozzle"
        :title="$t('Panels.ExtruderControlPanel.Headline')"
        :collapsible="true"
        card-class="extruder-control-panel">
        <!-- PANEL-HEADER 3-DOT-MENU -->
        <template #buttons>
            <v-menu v-if="showFilamentMacros" :offset-y="true" :close-on-content-click="false" left>
                <template #activator="{ on, attrs }">
                    <v-btn icon tile v-bind="attrs" v-on="on">
                        <v-icon>{{ mdiDotsVertical }}</v-icon>
                    </v-btn>
                </template>
                <v-list dense>
                    <!-- FILAMENT UNLOAD -->
                    <v-list-item v-if="unloadFilamentMacro">
                        <v-tooltip top :disabled="canExecuteUnloadMacro" color="secondary">
                            <template #activator="{ on }">
                                <div v-on="on">
                                    <macro-button
                                        :macro="unloadFilamentMacro"
                                        :alias="$t('Panels.ExtruderControlPanel.UnloadFilament')"
                                        :disabled="!canExecuteUnloadMacro || printerIsPrintingOnly"
                                        color="#272727" />
                                </div>
                            </template>
                            <span>
                                {{ $t('Panels.ExtruderControlPanel.ExtruderTempTooLow') }}
                                {{ minExtrudeTemp }} °C
                            </span>
                        </v-tooltip>
                    </v-list-item>
                    <!-- FILAMENT LOAD -->
                    <v-list-item v-if="loadFilamentMacro">
                        <v-tooltip top :disabled="canExecuteLoadMacro" color="secondary">
                            <template #activator="{ on }">
                                <div v-on="on">
                                    <macro-button
                                        :macro="loadFilamentMacro"
                                        :alias="$t('Panels.ExtruderControlPanel.LoadFilament')"
                                        :disabled="!canExecuteLoadMacro || printerIsPrintingOnly"
                                        color="#272727" />
                                </div>
                            </template>
                            <span>
                                {{ $t('Panels.ExtruderControlPanel.ExtruderTempTooLow') }}
                                {{ minExtrudeTemp }} °C
                            </span>
                        </v-tooltip>
                    </v-list-item>
                    <!-- FILAMENT PURGE -->
                    <v-list-item v-if="purgeFilamentMacro">
                        <v-tooltip top :disabled="canExecutePurgeMacro" color="secondary">
                            <template #activator="{ on }">
                                <div v-on="on">
                                    <macro-button
                                        :macro="purgeFilamentMacro"
                                        :alias="$t('Panels.ExtruderControlPanel.PurgeFilament')"
                                        :disabled="!canExecutePurgeMacro || printerIsPrintingOnly"
                                        color="#272727" />
                                </div>
                            </template>
                            <span>
                                {{ $t('Panels.ExtruderControlPanel.ExtruderTempTooLow') }}
                                {{ minExtrudeTemp }} °C
                            </span>
                        </v-tooltip>
                    </v-list-item>
                    <!-- NOZZLE CLEAN -->
                    <v-list-item v-if="cleanNozzleMacro">
                        <macro-button
                            :macro="cleanNozzleMacro"
                            :alias="$t('Panels.ExtruderControlPanel.CleanNozzle')"
                            :disabled="printerIsPrintingOnly"
                            color="#272727" />
                    </v-list-item>
                </v-list>
            </v-menu>
            <extruder-panel-settings />
        </template>
        <!-- IDEX HEAD SELECTOR -->
        <v-container v-if="hasDualCarriage" class="pb-0">
            <v-btn-toggle :value="activeHead" mandatory dense class="d-flex">
                <v-btn
                    :value="0"
                    class="flex-grow-1"
                    :disabled="headSelectionDisabled"
                    @click="selectHead(0)">
                    T0
                </v-btn>
                <v-btn
                    :value="1"
                    class="flex-grow-1"
                    :disabled="headSelectionDisabled"
                    @click="selectHead(1)">
                    T1
                </v-btn>
            </v-btn-toggle>
        </v-container>
        <!-- TOOL SELECTOR BUTTONS -->
        <extruder-control-panel-tools v-if="showTools && toolchangeMacros.length" />
        <!-- EXTRUSION FACTOR SLIDER -->
        <template v-if="showExtrusionFactor">
            <v-divider v-if="showTools" />
            <extrusion-factor-settings />
        </template>
        <!-- PRESSURE ADVANCE SETTINGS -->
        <template v-if="showPressureAdvance">
            <v-divider v-if="showTools || showExtrusionFactor" />
            <extruder-pressure-advance-settings v-if="extruderSteppers.length === 0" />
            <template v-else>
                <extruder-stepper-pressure-advance-settings
                    v-for="(extruderStepper, index) in extruderSteppers"
                    :key="extruderStepper"
                    :class="{ 'pt-3': index === 0 }"
                    :extruder-stepper="extruderStepper" />
            </template>
        </template>
        <!-- FIRMWARE RETRACTION SETTINGS -->
        <template v-if="showFirmwareRetraction">
            <v-divider v-if="showTools || showExtrusionFactor || showPressureAdvance" />
            <firmware-retraction-settings />
        </template>
        <!-- EXTRUDER INPUTS AND QUICKSELECTS -->
        <template v-if="showExtruderControl">
            <v-divider v-if="showTools || showExtrusionFactor || showPressureAdvance || showFirmwareRetraction" />
            <extruder-control-panel-control />
        </template>
    </panel>
</template>

<script lang="ts">
import { mdiPrinter3dNozzle, mdiDotsVertical } from '@mdi/js'
import { Component, Mixins } from 'vue-property-decorator'
import { PrinterStateMacro } from '@/store/printer/types'
import BaseMixin from '@/components/mixins/base'
import ControlMixin from '@/components/mixins/control'
import ExtruderMixin from '@/components/mixins/extruder'

@Component
export default class ExtruderControlPanel extends Mixins(BaseMixin, ControlMixin, ExtruderMixin) {
    mdiPrinter3dNozzle = mdiPrinter3dNozzle
    mdiDotsVertical = mdiDotsVertical

    private heatWaitGcodes = ['printer.extruder.can_extrude', 'TEMPERATURE_WAIT', 'M109']

    get showPanel(): boolean {
        return this.klipperReadyForGui && this.extruders.length > 0
    }

    get hasDualCarriage(): boolean {
        return Boolean(this.$store.state.printer?.dual_carriage && this.$store.state.printer?.extruder1)
    }

    get activeHead(): number {
        return this.activeExtruder === 'extruder1' ? 1 : 0
    }

    get headSelectionDisabled(): boolean {
        return (
            ['printing', 'paused'].includes(this.printer_state) ||
            Boolean(this.$store.state.printer?.continuous_extrusion?.active)
        )
    }

    selectHead(head: number): void {
        if (head === this.activeHead || this.headSelectionDisabled) return
        const script = this.$store.state.printer?.flow_idex_modes
            ? `SET_FLOW_MODE MODE=NORMAL TOOL=${head}`
            : `SET_DUAL_CARRIAGE CARRIAGE=${head} MODE=PRIMARY\nACTIVATE_EXTRUDER EXTRUDER=${
                  head === 1 ? 'extruder1' : 'extruder'
              }`

        this.$store.dispatch('server/addEvent', { message: script, type: 'command' })
        this.$socket.emit('printer.gcode.script', { script })
    }

    get macros() {
        return this.$store.getters['printer/getMacros']
    }

    get loadFilamentMacro(): PrinterStateMacro | undefined {
        const macros = ['LOAD_FILAMENT', 'FILAMENT_LOAD']

        return this.macros.find((macro: PrinterStateMacro) => macros.includes(macro.name.toUpperCase()))
    }

    get unloadFilamentMacro(): PrinterStateMacro | undefined {
        const macros = ['UNLOAD_FILAMENT', 'FILAMENT_UNLOAD']

        return this.macros.find((macro: PrinterStateMacro) => macros.includes(macro.name.toUpperCase()))
    }

    get purgeFilamentMacro(): PrinterStateMacro | undefined {
        const macros = ['PURGE_FILAMENT', 'FILAMENT_PURGE']

        return this.macros.find((macro: PrinterStateMacro) => macros.includes(macro.name.toUpperCase()))
    }

    get cleanNozzleMacro(): PrinterStateMacro | undefined {
        const macros = ['CLEAN_NOZZLE', 'NOZZLE_CLEAN', 'WIPE_NOZZLE', 'NOZZLE_WIPE']

        return this.macros.find((macro: PrinterStateMacro) => macros.includes(macro.name.toUpperCase()))
    }

    /**
     * test if the load and unload macro include specific keywords. if true, we allow
     * execution of that macro even if at the current time extrudePossible === false
     */
    get canExecuteLoadMacro(): boolean {
        if (this.extrudePossible) return true

        return this.heatWaitGcodes.some((gcode) => this.loadFilamentMacro?.prop.gcode.includes(gcode))
    }

    get canExecuteUnloadMacro(): boolean {
        if (this.extrudePossible) return true

        return this.heatWaitGcodes.some((gcode) => this.unloadFilamentMacro?.prop.gcode.includes(gcode))
    }

    get canExecutePurgeMacro(): boolean {
        if (this.extrudePossible) return true

        return this.heatWaitGcodes.some((gcode) => this.purgeFilamentMacro?.prop.gcode.includes(gcode))
    }

    get showFilamentMacros(): boolean {
        return (
            this.loadFilamentMacro !== undefined ||
            this.unloadFilamentMacro !== undefined ||
            this.purgeFilamentMacro !== undefined ||
            this.cleanNozzleMacro !== undefined
        )
    }

    get showTools(): boolean {
        if (this.toolchangeMacros.length < 1) return false

        return this.$store.state.gui.view.extruder.showTools ?? true
    }

    get showExtrusionFactor(): boolean {
        return this.$store.state.gui.view.extruder.showExtrusionFactor ?? true
    }

    get extruderSteppers() {
        return Object.keys(this.$store.state.printer)
            .filter((e) => e.startsWith('extruder_stepper '))
            .sort((a, b) => a.localeCompare(b))
    }

    get showPressureAdvance(): boolean {
        return this.$store.state.gui.view.extruder.showPressureAdvance ?? true
    }

    get showFirmwareRetraction(): boolean {
        if (!this.existsFirmwareRetraction) return false

        return this.$store.state.gui.view.extruder.showFirmwareRetraction ?? true
    }

    get showExtruderControl(): boolean {
        return this.$store.state.gui.view.extruder.showExtruderControl ?? true
    }
}
</script>
