<template>
    <panel
        v-if="klipperReadyForGui"
        :icon="mdiGamepad"
        :title="$t('Panels.ToolheadControlPanel.Headline')"
        :collapsible="true"
        card-class="toolhead-control-panel">
        <!-- PANEL-HEADER 3-DOT-MENU -->
        <template #buttons>
            <v-menu v-if="showButtons" left offset-y :close-on-content-click="false" class="pa-0">
                <template #activator="{ on, attrs }">
                    <v-btn icon tile v-bind="attrs" :disabled="['printing'].includes(printer_state)" v-on="on">
                        <v-icon>{{ mdiDotsVertical }}</v-icon>
                    </v-btn>
                </template>
                <v-list dense>
                    <v-list-item v-if="controlStyle !== 'bars' && actionButton !== 'm84'">
                        <v-btn small style="width: 100%" @click="doSend('M84')">
                            <v-icon left small>{{ mdiEngineOff }}</v-icon>
                            {{ $t('Settings.ControlTab.MotorsOff', { isDefault: '' }) }}
                        </v-btn>
                    </v-list-item>
                    <v-list-item v-if="controlStyle !== 'bars' && existsZtilt && actionButton !== 'ztilt'">
                        <v-btn small style="width: 100%" @click="doZtilt">Z-Tilt Adjust</v-btn>
                    </v-list-item>
                    <v-list-item v-if="controlStyle !== 'bars' && existsQGL && actionButton !== 'qgl'">
                        <v-btn small style="width: 100%" @click="doQGL">Quad Gantry Level</v-btn>
                    </v-list-item>
                    <!-- SPECIAL BUTTONS ALWAYS INSIDE 3-DOT MENU -->
                    <v-list-item v-if="existsBedTilt">
                        <v-btn small style="width: 100%" @click="doSend('BED_TILT_CALIBRATE')">
                            BED TILT CALIBRATE
                        </v-btn>
                    </v-list-item>
                    <v-list-item v-if="existsBedScrews">
                        <v-btn small style="width: 100%" @click="doSend('BED_SCREWS_ADJUST')">BED SCREWS ADJUST</v-btn>
                    </v-list-item>
                    <v-list-item v-if="existsDeltaCalibrate">
                        <v-btn small style="width: 100%" @click="doSend('DELTA_CALIBRATE')">DELTA CALIBRATE</v-btn>
                    </v-list-item>
                    <v-list-item v-if="existsScrewsTilt">
                        <div class="d-flex align-center" style="width: 100%">
                            <v-btn
                                small
                                style="border-top-right-radius: 0; border-bottom-right-radius: 0"
                                @click="doSend('SCREWS_TILT_CALCULATE')">
                                SCREWS TILT CALCULATE
                            </v-btn>
                            <v-menu offset-y left :close-on-content-click="false">
                                <template #activator="{ on, attrs }">
                                    <v-btn
                                        small
                                        v-bind="attrs"
                                        class="px-0"
                                        style="min-width: 32px; border-top-left-radius: 0; border-bottom-left-radius: 0"
                                        v-on="on">
                                        <v-icon>{{ mdiMenuDown }}</v-icon>
                                    </v-btn>
                                </template>
                                <v-list dense>
                                    <v-list-item>
                                        <v-btn
                                            small
                                            style="width: 100%"
                                            @click="doSend('SCREWS_TILT_CALCULATE DIRECTION=CW')">
                                            <v-icon left small style="transform: scaleX(-1)">{{ mdiRestore }}</v-icon>
                                            <span>CW</span>
                                        </v-btn>
                                    </v-list-item>
                                    <v-list-item>
                                        <v-btn
                                            small
                                            style="width: 100%"
                                            @click="doSend('SCREWS_TILT_CALCULATE DIRECTION=CCW')">
                                            <v-icon left small>{{ mdiRestore }}</v-icon>
                                            <span>CCW</span>
                                        </v-btn>
                                    </v-list-item>
                                </v-list>
                            </v-menu>
                        </div>
                    </v-list-item>
                </v-list>
            </v-menu>
            <toolhead-panel-settings />
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
        <!-- MOVE TO CONTROL -->
        <move-to-control />
        <!-- AXIS CONTROL -->
        <v-container v-if="axisControlVisible">
            <component :is="`${controlStyle}-control`" />
        </v-container>
        <!-- Z-OFFSET CONTROL -->
        <v-divider v-if="showZOffset" />
        <v-container v-if="showZOffset">
            <zoffset-control />
        </v-container>
        <!-- SPEED FACTOR -->
        <v-divider v-if="showSpeedFactor" />
        <v-container v-if="showSpeedFactor">
            <tool-slider
                :label="$t('Panels.ToolheadControlPanel.SpeedFactor')"
                :icon="mdiSpeedometer"
                :target="speedFactor"
                :min="1"
                :max="200"
                :multi="100"
                :step="5"
                :dynamic-range="true"
                :has-input-field="true"
                command="M220"
                attribute-name="S" />
        </v-container>
    </panel>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator'
import BarsControl from '@/components/panels/ToolheadControls/BarsControl.vue'
import BaseMixin from '../mixins/base'
import CircleControl from '@/components/panels/ToolheadControls/CircleControl.vue'
import ControlMixin from '@/components/mixins/control'
import CrossControl from '@/components/panels/ToolheadControls/CrossControl.vue'
import MoveToControl from '@/components/panels/ToolheadControls/MoveToControl.vue'
import Panel from '@/components/ui/Panel.vue'
import ToolSlider from '@/components/inputs/ToolSlider.vue'
import ZoffsetControl from '@/components/panels/ToolheadControls/ZoffsetControl.vue'
import { mdiDotsVertical, mdiEngineOff, mdiGamepad, mdiSpeedometer, mdiMenuDown, mdiRestore } from '@mdi/js'

@Component({
    components: {
        BarsControl,
        CircleControl,
        CrossControl,
        MoveToControl,
        Panel,
        ToolSlider,
        ZoffsetControl,
    },
})
export default class ToolheadControlPanel extends Mixins(BaseMixin, ControlMixin) {
    mdiDotsVertical = mdiDotsVertical
    mdiEngineOff = mdiEngineOff
    mdiGamepad = mdiGamepad
    mdiSpeedometer = mdiSpeedometer
    mdiRestore = mdiRestore
    mdiMenuDown = mdiMenuDown

    get controlStyle(): string {
        return this.$store.state.gui.control.style ?? 'bars'
    }

    get actionButton(): string {
        return this.$store.state.gui.control.actionButton ?? this.defaultActionButton
    }

    get speedFactor(): number {
        return this.$store.state.printer?.gcode_move?.speed_factor ?? 1
    }

    get hasDualCarriage(): boolean {
        return Boolean(this.$store.state.printer?.dual_carriage && this.$store.state.printer?.extruder1)
    }

    get flowModes(): Record<string, unknown> | null {
        return this.$store.state.printer?.flow_idex_modes ?? null
    }

    get activeHead(): number {
        const carriages = this.$store.state.printer?.dual_carriage?.carriages

        if (carriages?.stepper_x === 'INACTIVE' && carriages?.dual_carriage !== 'INACTIVE') return 1

        return 0
    }

    get headSelectionDisabled(): boolean {
        return ['printing', 'paused'].includes(this.printer_state) || this.$store.state.printer?.continuous_jog?.active
    }

    selectHead(head: number): void {
        if (head === this.activeHead || this.headSelectionDisabled) return
        const script = this.flowModes
            ? `SET_FLOW_MODE MODE=NORMAL TOOL=${head}`
            : `SET_DUAL_CARRIAGE CARRIAGE=${head} MODE=PRIMARY\nACTIVATE_EXTRUDER EXTRUDER=${
                  head === 1 ? 'extruder1' : 'extruder'
              }`

        this.$store.dispatch('server/addEvent', { message: script, type: 'command' })
        this.$socket.emit('printer.gcode.script', { script })
    }

    get isPrinting() {
        return ['printing'].includes(this.printer_state)
    }

    get axisControlVisible() {
        if (!this.showControl) return false

        return !(this.isPrinting && (this.$store.state.gui.control.hideDuringPrint ?? false))
    }

    get showButtons() {
        if (this.controlStyle !== 'bars' && (this.existsZtilt || this.existsQGL)) return true

        return this.existsBedScrews || this.existsBedTilt || this.existsDeltaCalibrate || this.existsScrewsTilt
    }

    get showControl(): boolean {
        return this.$store.state.gui.view.toolhead.showControl ?? true
    }

    get showZOffset(): boolean {
        return this.$store.state.gui.view.toolhead.showZOffset ?? true
    }

    get showSpeedFactor(): boolean {
        return this.$store.state.gui.view.toolhead.showSpeedFactor ?? true
    }
}
</script>
