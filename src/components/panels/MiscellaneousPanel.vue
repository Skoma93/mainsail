<template>
    <panel
        v-if="showMiscellaneousPanel"
        :icon="mdiDipSwitch"
        :title="$t('Panels.MiscellaneousPanel.Headline')"
        :collapsible="true"
        card-class="miscellaneous-panel">
        <v-container v-if="flowModesAvailable" class="px-0 py-2">
            <v-subheader class="adaptive-stabilization-subheader">
                <v-icon small class="mr-2">{{ mdiThermometerLines }}</v-icon>
                <span>{{ $t('Panels.MiscellaneousPanel.AdaptiveBedStabilization') }}</span>
                <v-spacer />
                <small class="mr-3 text--secondary">{{ adaptiveBedStabilizationStatus }}</small>
                <v-icon @click="adaptiveBedStabilization = !adaptiveBedStabilization">
                    {{ adaptiveBedStabilization ? mdiToggleSwitch : mdiToggleSwitchOffOutline }}
                </v-icon>
            </v-subheader>
        </v-container>
        <v-divider v-if="flowModesAvailable && hasMiscellaneousContent" />
        <div v-for="(object, index) of miscellaneous" :key="index">
            <v-divider v-if="index" />
            <miscellaneous-slider
                :name="object.name"
                :type="object.type"
                :target="object.power"
                :rpm="object.rpm"
                :controllable="object.controllable"
                :pwm="object.pwm"
                :off_below="object.off_below"
                :max="object.max_power"
                :multi="parseInt(object.scale)" />
        </div>
        <div v-for="(light, index) of lights" :key="'light_' + light.name">
            <v-divider v-if="index || miscellaneous.length" />
            <miscellaneous-light :type="light.type" :name="light.name" />
        </div>
        <div v-for="(sensor, index) of filamentSensors" :key="'sensor_' + index">
            <v-divider v-if="index || miscellaneous.length || lights.length" />
            <filament-sensor
                :type="sensor.type"
                :name="sensor.name"
                :enabled="sensor.enabled"
                :filament_detected="sensor.filament_detected"
                :filament_diameter="sensor.filament_diameter"
                :detection_length="sensor.detection_length"
                :minimum_flow="sensor.minimum_flow"
                :flow_percentage="sensor.flow_percentage" />
        </div>
        <div v-for="(sensor, index) of miscellaneousSensors" :key="'miscellaneous_sensor_' + index">
            <v-divider v-if="index || miscellaneous.length || lights.length || filamentSensors.length" />
            <miscellaneous-sensor :name="sensor.name" :value="sensor.value" :unit="sensor.unit" />
        </div>
        <div v-for="(sensor, index) of moonrakerSensors" :key="'moonraker_sensor_' + index">
            <v-divider
                v-if="
                    index ||
                    miscellaneous.length ||
                    lights.length ||
                    filamentSensors.length ||
                    miscellaneousSensors.length
                " />
            <moonraker-sensor :name="sensor" />
        </div>
    </panel>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator'
import BaseMixin from '@/components/mixins/base'
import MiscellaneousSlider from '@/components/inputs/MiscellaneousSlider.vue'
import FilamentSensor from '@/components/inputs/FilamentSensor.vue'
import MiscellaneousLight from '@/components/panels/Miscellaneous/MiscellaneousLight.vue'
import MiscellaneousSensor from '@/components/panels/Miscellaneous/MiscellaneousSensor.vue'
import MoonrakerSensor from '@/components/panels/Miscellaneous/MoonrakerSensor.vue'
import Panel from '@/components/ui/Panel.vue'
import { mdiDipSwitch, mdiThermometerLines, mdiToggleSwitch, mdiToggleSwitchOffOutline } from '@mdi/js'
import MiscellaneousMixin from '@/components/mixins/miscellaneous'
@Component({
    components: {
        Panel,
        FilamentSensor,
        MiscellaneousSlider,
        MiscellaneousLight,
        MiscellaneousSensor,
        MoonrakerSensor,
    },
})
export default class MiscellaneousPanel extends Mixins(BaseMixin, MiscellaneousMixin) {
    mdiDipSwitch = mdiDipSwitch
    mdiThermometerLines = mdiThermometerLines
    mdiToggleSwitch = mdiToggleSwitch
    mdiToggleSwitchOffOutline = mdiToggleSwitchOffOutline

    get flowModesAvailable(): boolean {
        return Boolean(this.$store.state.printer?.flow_idex_modes)
    }

    get adaptiveBedStabilization(): boolean {
        return this.$store.state.gui.control.adaptiveBedStabilization ?? true
    }

    set adaptiveBedStabilization(newVal: boolean) {
        this.$store.dispatch('gui/saveSetting', { name: 'control.adaptiveBedStabilization', value: newVal })
    }

    get adaptiveBedStabilizationStatus(): string {
        if (!this.adaptiveBedStabilization) return this.$t('Panels.MiscellaneousPanel.Skipped').toString()
        const seconds = this.$store.state.printer?.flow_idex_modes?.adaptive_bed_stabilization_time ?? 0
        return this.$t('Panels.MiscellaneousPanel.Seconds', { seconds }).toString()
    }

    get filamentSensors() {
        return this.$store.getters['printer/getFilamentSensors'] ?? []
    }

    get miscellaneous() {
        return this.$store.getters['printer/getMiscellaneous'] ?? []
    }

    get miscellaneousSensors() {
        return this.$store.getters['printer/getMiscellaneousSensors'] ?? []
    }

    get moonrakerSensors() {
        return this.$store.getters['server/sensor/getSensors'] ?? []
    }

    get hasMiscellaneousContent(): boolean {
        return Boolean(
            this.miscellaneous.length ||
                this.lights.length ||
                this.filamentSensors.length ||
                this.miscellaneousSensors.length ||
                this.moonrakerSensors.length
        )
    }

    get showMiscellaneousPanel() {
        return (
            this.klipperReadyForGui && (this.flowModesAvailable || this.hasMiscellaneousContent)
        )
    }
}
</script>

<style scoped>
.adaptive-stabilization-subheader {
    height: auto;
}
</style>
