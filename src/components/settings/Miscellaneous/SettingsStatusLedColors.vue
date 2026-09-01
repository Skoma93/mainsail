<template>
    <v-card outlined class="mb-4">
        <v-card-title>{{ $t('Settings.MiscellaneousTab.StatusLedColors') }}</v-card-title>
        <v-card-subtitle>{{ $t('Settings.MiscellaneousTab.StatusLedColorsDescription') }}</v-card-subtitle>
        <v-card-text>
            <v-row dense>
                <v-col v-for="entry in states" :key="entry.state" cols="12" sm="6">
                    <v-text-field
                        :label="entry.label"
                        :value="color(entry.state)"
                        type="color"
                        hide-details
                        outlined
                        dense
                        @change="saveColor(entry.state, $event)" />
                </v-col>
            </v-row>
        </v-card-text>
    </v-card>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator'
import BaseMixin from '@/components/mixins/base'

@Component
export default class SettingsStatusLedColors extends Mixins(BaseMixin) {
    readonly defaults: Record<string, string> = {
        idle: '0033FF',
        printing: '00FF00',
        paused: 'FF8000',
        warning: 'FFFF00',
        finished: '00FFFF',
        error: 'FF0000',
    }

    get states() {
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
