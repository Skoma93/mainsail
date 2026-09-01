<template>
    <v-container class="px-0 py-2">
        <v-row>
            <v-col class="pb-3">
                <v-subheader class="_filamentRunout-subheader">
                    <v-icon small class="mr-2">{{ mdiPrinter3dNozzleAlert }}</v-icon>
                    <span>{{ convertName(name) }}</span>
                    <v-spacer />
                    <small :class="'mr-3 ' + statusColor + '--text'">{{ statusText }}</small>
                    <v-icon @click="changeSensor">
                        {{ enabled ? mdiToggleSwitch : mdiToggleSwitchOffOutline }}
                    </v-icon>
                </v-subheader>
            </v-col>
        </v-row>
        <v-card-text v-if="isPat9125" class="py-0 pb-2">
            <div class="d-flex justify-space-between text-caption">
                <span>{{ $t('Panels.MiscellaneousPanel.RunoutSensor.MinimumFlow') }}</span>
                <span>{{ sensitivityValue.toFixed(0) }}%</span>
            </div>
            <v-slider
                v-model="sensitivityValue"
                :disabled="!enabled"
                :min="1"
                :max="100"
                :step="1"
                hide-details
                @change="changeSensitivity" />
            <div class="text-caption text--secondary">
                {{ flow_percentage.toFixed(0) }}%
                {{ $t('Panels.MiscellaneousPanel.RunoutSensor.MeasuredFlow') }}
                · {{ detection_length.toFixed(1) }} mm
                {{ $t('Panels.MiscellaneousPanel.RunoutSensor.EvaluationWindow') }}
            </div>
        </v-card-text>
    </v-container>
</template>

<script lang="ts">
import { convertName } from '@/plugins/helpers'
import { Component, Mixins, Prop, Watch } from 'vue-property-decorator'
import { Debounce } from 'vue-debounce-decorator'
import BaseMixin from '@/components/mixins/base'
import { mdiPrinter3dNozzleAlert, mdiToggleSwitch, mdiToggleSwitchOffOutline } from '@mdi/js'

@Component
export default class FilamentSensor extends Mixins(BaseMixin) {
    /**
     * Icons
     */

    mdiToggleSwitch = mdiToggleSwitch
    mdiToggleSwitchOffOutline = mdiToggleSwitchOffOutline
    mdiPrinter3dNozzleAlert = mdiPrinter3dNozzleAlert

    convertName = convertName

    @Prop({ type: String, required: true }) declare readonly type: string
    @Prop({ type: String, required: true }) declare readonly name: string
    @Prop({ type: Boolean, required: true }) declare readonly enabled: boolean
    @Prop({ type: Boolean, required: true }) declare readonly filament_detected: boolean
    @Prop({ type: Number }) declare readonly filament_diameter: number
    @Prop({ type: Number, default: 4 }) declare readonly detection_length: number
    @Prop({ type: Number, default: 70 }) declare readonly minimum_flow: number
    @Prop({ type: Number, default: 100 }) declare readonly flow_percentage: number

    sensitivityValue = 70

    get isPat9125(): boolean {
        return this.type === 'pat9125_filament_sensor'
    }

    get statusColor() {
        if (!this.enabled) return 'gray'
        else if (this.filament_detected) return 'success'

        return 'warning'
    }

    get statusText() {
        if (this.filament_diameter !== undefined && this.filament_detected) {
            return this.filament_diameter.toPrecision(3) + 'mm'
        }
        if (this.filament_detected) return this.$t('Panels.MiscellaneousPanel.RunoutSensor.Detected')

        return this.$t('Panels.MiscellaneousPanel.RunoutSensor.Empty')
    }

    @Watch('minimum_flow', { immediate: true })
    minimumFlowChanged(value: number): void {
        this.sensitivityValue = value
    }

    changeSensor() {
        const gcodes = ['SET_FILAMENT_SENSOR SENSOR=' + this.name + ' ENABLE=' + (this.enabled ? 0 : 1)]
        if (this.type == 'hall_filament_width_sensor') {
            gcodes.push((this.enabled ? 'DIS' : 'EN') + 'ABLE_FILAMENT_WIDTH_SENSOR')
        }
        for (const gcode of gcodes) {
            this.$store.dispatch('server/addEvent', { message: gcode, type: 'command' })
            this.$socket.emit('printer.gcode.script', { script: gcode })
        }
    }

    @Debounce(300)
    changeSensitivity(): void {
        const gcode = `SET_FMS_SENSITIVITY SENSOR=${this.name} FLOW=${this.sensitivityValue.toFixed(0)}`
        this.$store.dispatch('server/addEvent', { message: gcode, type: 'command' })
        this.$socket.emit('printer.gcode.script', { script: gcode })
    }
}
</script>

<style scoped>
._filamentRunout-subheader {
    height: auto;
}
</style>
