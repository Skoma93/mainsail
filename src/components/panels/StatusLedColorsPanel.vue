<template>
    <panel
        v-if="available"
        :icon="mdiPalette"
        :title="$t('Panels.StatusLedColorsPanel.Headline')"
        :collapsible="true"
        card-class="status-led-colors-panel">
        <v-container>
            <v-row dense>
                <v-col v-for="entry in states" :key="entry.state" cols="6">
                    <v-text-field
                        class="status-color-input"
                        :label="entry.label"
                        :value="color(entry.state)"
                        type="color"
                        hide-details
                        outlined
                        dense
                        @change="saveColor(entry.state, $event)" />
                </v-col>
            </v-row>
        </v-container>
    </panel>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator'
import { mdiPalette } from '@mdi/js'
import BaseMixin from '@/components/mixins/base'
import Panel from '@/components/ui/Panel.vue'

@Component({ components: { Panel } })
export default class StatusLedColorsPanel extends Mixins(BaseMixin) {
    mdiPalette = mdiPalette
    readonly defaults: Record<string, string> = {
        idle: '0033FF',
        printing: '00FF00',
        paused: 'FF8000',
        warning: 'FFFF00',
        finished: '00FFFF',
        error: 'FF0000',
    }

    get available(): boolean {
        return Boolean(
            this.$store.state.printer?.save_variables &&
                this.$store.state.printer?.['gcode_macro SET_STATUS_LED_COLOR']
        )
    }

    get states(): { state: string; label: string }[] {
        return ['idle', 'printing', 'paused', 'warning', 'finished', 'error'].map((state) => ({
            state,
            label: this.$t(`Settings.MiscellaneousTab.StatusLedState.${state}`).toString(),
        }))
    }

    get savedVariables(): Record<string, unknown> {
        return this.$store.state.printer.save_variables?.variables ?? {}
    }

    color(state: string): string {
        const saved = this.savedVariables[`status_led_${state}_color`]
        const value = typeof saved === 'string' ? saved : this.defaults[state]
        return `#${value.replace('#', '').toUpperCase()}`
    }

    saveColor(state: string, value: string): void {
        const color = value.replace('#', '').toUpperCase()
        const gcode = `SET_STATUS_LED_COLOR STATE=${state} COLOR=${color}`
        this.$store.dispatch('server/addEvent', { message: gcode, type: 'command' })
        this.$socket.emit('printer.gcode.script', { script: gcode })
    }
}
</script>

<style scoped>
::v-deep .status-color-input input[type='color'] {
    height: 16px;
    max-height: 16px;
    padding-bottom: 2px;
    padding-top: 2px;
}

::v-deep .status-color-input input[type='color']::-webkit-color-swatch-wrapper {
    padding-bottom: 0;
    padding-top: 0;
}
</style>
