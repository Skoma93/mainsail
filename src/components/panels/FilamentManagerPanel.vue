<template>
    <panel
        v-if="klipperReadyForGui"
        :icon="mdiPalette"
        :title="$t('Panels.FilamentManagerPanel.Headline')"
        :collapsible="true"
        card-class="filament-manager-panel">
        <v-container>
            <div v-for="tool in tools" :key="tool" class="filament-head-row">
                <v-btn
                    icon
                    x-large
                    class="filament-button"
                    :title="$t('Panels.FilamentManagerPanel.SelectPreset')"
                    @click="openSelector(tool)">
                    <span
                        class="filament-swatch"
                        :class="{ 'transparent-color': profiles[tool].color === '00000000' }"
                        :style="profiles[tool].color === '00000000' ? {} : { backgroundColor: profileColor(tool) }" />
                </v-btn>
                <div class="filament-details">
                    <div class="filament-tool">{{ $t('Panels.FilamentManagerPanel.Tool', { tool }) }}</div>
                    <div class="filament-profile">{{ profileLabel(tool) }}</div>
                    <div class="filament-temperature text--secondary">
                        {{ $t('Panels.FilamentManagerPanel.Nozzle') }} {{ profiles[tool].nozzle }} °C ·
                        {{ $t('Panels.FilamentManagerPanel.Bed') }} {{ profiles[tool].bed }} °C
                    </div>
                    <div class="filament-temperature text--secondary">
                        {{ liveTemperature(tool) }}
                    </div>
                </div>
                <div class="filament-actions">
                    <v-btn small :disabled="heatDisabled" @click="heat(tool, 'HEAD')">
                        {{ $t('Panels.FilamentManagerPanel.HeatHead') }}
                    </v-btn>
                    <v-btn small :disabled="heatDisabled || !hasBed" @click="heat(tool, 'BED')">
                        {{ $t('Panels.FilamentManagerPanel.HeatBed') }}
                    </v-btn>
                    <v-btn small color="primary" :disabled="heatDisabled || !hasBed" @click="heat(tool, 'ALL')">
                        {{ $t('Panels.FilamentManagerPanel.HeatBoth') }}
                    </v-btn>
                </div>
            </div>
        </v-container>

        <v-dialog v-model="selectorOpen" max-width="440">
            <v-card>
                <v-card-title>{{ $t('Panels.FilamentManagerPanel.SelectPreset') }}</v-card-title>
                <v-card-text>
                    <v-list class="filament-preset-list">
                        <v-list-item
                            v-for="preset in presets"
                            :key="preset.material"
                            link
                            :class="{ 'primary--text': draft.material === preset.material }"
                            @click="selectPreset(preset)">
                            <v-list-item-icon><span class="preset-icon">🧵</span></v-list-item-icon>
                            <v-list-item-content>
                                <v-list-item-title>{{ preset.material }}</v-list-item-title>
                                <v-list-item-subtitle>
                                    {{ preset.nozzle }} °C {{ $t('Panels.FilamentManagerPanel.Nozzle') }} ·
                                    {{ preset.bed }} °C {{ $t('Panels.FilamentManagerPanel.Bed') }}
                                </v-list-item-subtitle>
                            </v-list-item-content>
                        </v-list-item>
                    </v-list>
                    <div class="text-subtitle-2 mb-2">{{ $t('Panels.FilamentManagerPanel.Color') }}</div>
                    <div class="color-options mb-5">
                        <v-btn
                            v-for="color in colors"
                            :key="color.value"
                            icon
                            :title="color.name"
                            :class="{ 'selected-color': draft.color === color.value }"
                            @click="selectColor(color.value)">
                            <span
                                class="color-option"
                                :class="{ 'transparent-color': color.value === '00000000' }"
                                :style="color.value === '00000000' ? {} : { backgroundColor: `#${color.value}` }" />
                        </v-btn>
                        <v-btn icon :title="$t('Panels.FilamentManagerPanel.CustomColor')" @click="openCustomColor">
                            <v-icon>{{ mdiPalette }}</v-icon>
                        </v-btn>
                    </div>
                    <v-row>
                        <v-col class="col-6">
                            <v-text-field
                                v-model.number="draft.nozzle"
                                type="number"
                                min="0"
                                max="300"
                                :label="$t('Panels.FilamentManagerPanel.NozzleTemperature')"
                                suffix="°C"
                                dense
                                outlined />
                        </v-col>
                        <v-col class="col-6">
                            <v-text-field
                                v-model.number="draft.bed"
                                type="number"
                                min="0"
                                max="130"
                                :label="$t('Panels.FilamentManagerPanel.BedTemperature')"
                                suffix="°C"
                                dense
                                outlined />
                        </v-col>
                    </v-row>
                </v-card-text>
                <v-card-actions>
                    <v-spacer />
                    <v-btn text @click="selectorOpen = false">{{ $t('Cancel') }}</v-btn>
                    <v-btn color="primary" :disabled="!draftValid" @click="saveDraft">
                        {{ $t('Panels.FilamentManagerPanel.Save') }}
                    </v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>
        <v-dialog v-model="customColorOpen" max-width="340">
            <v-card>
                <v-card-title>{{ $t('Panels.FilamentManagerPanel.CustomColor') }}</v-card-title>
                <v-card-text>
                    <v-color-picker v-model="customColor" mode="hexa" hide-mode-switch class="mx-auto" />
                </v-card-text>
                <v-card-actions>
                    <v-spacer />
                    <v-btn text @click="customColorOpen = false">{{ $t('Cancel') }}</v-btn>
                    <v-btn color="primary" @click="applyCustomColor">
                        {{ $t('Panels.FilamentManagerPanel.Apply') }}
                    </v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>
    </panel>
</template>

<script lang="ts">
import { Component, Mixins, Watch } from 'vue-property-decorator'
import { mdiPalette } from '@mdi/js'
import BaseMixin from '@/components/mixins/base'

type FilamentProfile = { material: string; color: string; colorCustom: boolean; nozzle: number; bed: number }

const defaultPresets: FilamentProfile[] = [
    { material: 'PLA', color: 'FFFFFF', colorCustom: false, nozzle: 200, bed: 60 },
    { material: 'PETG', color: 'FFFFFF', colorCustom: false, nozzle: 240, bed: 80 },
    { material: 'ABS', color: 'FFFFFF', colorCustom: false, nozzle: 250, bed: 100 },
    { material: 'TPU', color: 'FFFFFF', colorCustom: false, nozzle: 220, bed: 50 },
    { material: 'ASA', color: 'FFFFFF', colorCustom: false, nozzle: 250, bed: 100 },
]

@Component
export default class FilamentManagerPanel extends Mixins(BaseMixin) {
    mdiPalette = mdiPalette
    tools = [0, 1]
    colors = [
        { name: 'White', value: 'FFFFFF' },
        { name: 'Black', value: '111111' },
        { name: 'Gray', value: '808080' },
        { name: 'Silver', value: 'BDBDBD' },
        { name: 'Red', value: 'F44336' },
        { name: 'Dark red', value: 'B71C1C' },
        { name: 'Orange', value: 'FF9800' },
        { name: 'Gold', value: 'FFD700' },
        { name: 'Yellow', value: 'FFEB3B' },
        { name: 'Lime', value: 'CDDC39' },
        { name: 'Green', value: '4CAF50' },
        { name: 'Dark green', value: '1B5E20' },
        { name: 'Teal', value: '009688' },
        { name: 'Cyan', value: '00BCD4' },
        { name: 'Blue', value: '2196F3' },
        { name: 'Dark blue', value: '0D47A1' },
        { name: 'Light blue', value: '81D4FA' },
        { name: 'Purple', value: '9C27B0' },
        { name: 'Violet', value: '673AB7' },
        { name: 'Pink', value: 'E91E63' },
        { name: 'Magenta', value: 'FF00FF' },
        { name: 'Brown', value: '795548' },
        { name: 'Beige', value: 'D7CCC8' },
        { name: 'Natural', value: 'E8D9B5' },
        { name: 'Transparent', value: '00000000' },
    ]
    profiles: Record<number, FilamentProfile> = {
        0: { ...defaultPresets[0] },
        1: { ...defaultPresets[0] },
    }
    selectorOpen = false
    selectedTool = 0
    draft: FilamentProfile = { ...defaultPresets[0] }
    customColorOpen = false
    customColor = '#FFFFFF'

    mounted(): void {
        this.loadProfiles()
    }

    get savedVariables(): Record<string, unknown> {
        return this.$store.state.printer?.save_variables?.variables ?? {}
    }

    get presets(): FilamentProfile[] {
        const configured = this.$store.state.printer?.filament_presets ?? {}
        const entries = Array.isArray(configured.presets) ? configured.presets : []
        const presets = entries
            .filter(
                (entry: unknown) =>
                    Array.isArray(entry) &&
                    entry.length === 3 &&
                    typeof entry[0] === 'string' &&
                    Number.isFinite(Number(entry[1])) &&
                    Number.isFinite(Number(entry[2]))
            )
            .map((entry: [string, number, number]) => ({
                material: entry[0].toUpperCase(),
                color: 'FFFFFF',
                colorCustom: false,
                nozzle: Number(entry[1]),
                bed: Number(entry[2]),
            }))
            .filter(
                (preset: FilamentProfile) =>
                    preset.nozzle >= 0 && preset.nozzle <= 300 && preset.bed >= 0 && preset.bed <= 130
            )
        return presets.length > 0 ? presets : defaultPresets
    }

    get heatDisabled(): boolean {
        return this.printer_state === 'printing'
    }

    get hasBed(): boolean {
        return Boolean(this.$store.state.printer?.heater_bed)
    }

    get draftValid(): boolean {
        return (
            /^[0-9A-F]{6}([0-9A-F]{2})?$/.test(this.draft.color) &&
            this.draft.nozzle >= 0 &&
            this.draft.nozzle <= 300 &&
            this.draft.bed >= 0 &&
            this.draft.bed <= 130
        )
    }

    @Watch('savedVariables', { deep: true })
    loadProfiles(): void {
        const bed = Number(this.savedVariables.bed_target_temperature ?? 60)
        this.tools.forEach((tool) => {
            const material = String(this.savedVariables[`t${tool}_filament_material`] ?? 'PLA').toUpperCase()
            const preset = this.presets.find((entry) => entry.material === material) ?? this.presets[0]
            const color = String(this.savedVariables[`t${tool}_filament_color`] ?? preset.color).toUpperCase()
            const nozzle = Number(this.savedVariables[`t${tool}_filament_temperature`] ?? preset.nozzle)
            const colorCustom = Boolean(Number(this.savedVariables[`t${tool}_filament_color_custom`] ?? 0))
            this.profiles[tool] = {
                material: preset.material,
                color: /^[0-9A-F]{6}([0-9A-F]{2})?$/.test(color) ? color : preset.color,
                colorCustom,
                nozzle,
                bed,
            }
        })
    }

    profileColor(tool: number): string {
        return `#${this.profiles[tool].color}`
    }

    profileLabel(tool: number): string {
        const profile = this.profiles[tool]
        return profile.colorCustom ? `${profile.material} · #${profile.color}` : profile.material
    }

    liveTemperature(tool: number): string {
        const heater = this.$store.state.printer?.[tool === 1 ? 'extruder1' : 'extruder'] ?? {}
        const nozzle = `${Number(heater.temperature ?? 0).toFixed(0)}/${Number(heater.target ?? 0).toFixed(0)} °C`
        if (!this.hasBed) return `${nozzle} · ${this.$t('Panels.FilamentManagerPanel.BedUnavailable')}`
        const bed = this.$store.state.printer.heater_bed
        return `${nozzle} · ${this.$t('Panels.FilamentManagerPanel.Bed')} ${Number(bed.temperature ?? 0).toFixed(
            0
        )}/${Number(bed.target ?? 0).toFixed(0)} °C`
    }

    openSelector(tool: number): void {
        this.selectedTool = tool
        this.draft = { ...this.profiles[tool] }
        this.selectorOpen = true
    }

    selectPreset(preset: FilamentProfile): void {
        this.draft = { ...preset, color: this.draft.color, colorCustom: this.draft.colorCustom }
    }

    selectColor(color: string): void {
        this.draft.color = color
        this.draft.colorCustom = false
    }

    openCustomColor(): void {
        this.customColor = this.draft.color.length === 8 ? `#${this.draft.color}` : `#${this.draft.color}FF`
        this.customColorOpen = true
    }

    applyCustomColor(): void {
        this.draft.color = this.customColor.replace('#', '').toUpperCase()
        this.draft.colorCustom = true
        this.customColorOpen = false
    }

    saveDraft(): void {
        if (!this.draftValid) return
        const profile = this.draft
        const script = `SET_FILAMENT_PROFILE TOOL=${this.selectedTool} MATERIAL=${profile.material} COLOR=${profile.color.toUpperCase()} COLOR_CUSTOM=${profile.colorCustom ? 1 : 0} NOZZLE=${profile.nozzle} BED=${profile.bed}`
        this.send(script)
        this.selectorOpen = false
    }

    heat(tool: number, heater: 'HEAD' | 'BED' | 'ALL'): void {
        if (this.heatDisabled) return
        this.send(`HEAT_FILAMENT_PROFILE TOOL=${tool} HEATER=${heater}`)
    }

    send(script: string): void {
        this.$store.dispatch('server/addEvent', { message: script, type: 'command' })
        this.$socket.emit('printer.gcode.script', { script })
    }
}
</script>

<style scoped>
.filament-head-row {
    align-items: center;
    border-bottom: 1px solid rgba(128, 128, 128, 0.25);
    display: flex;
    gap: 16px;
    padding: 14px 0;
}
.filament-head-row:last-child {
    border-bottom: 0;
}
.filament-button {
    height: 64px !important;
    width: 64px !important;
}
.filament-swatch {
    align-items: center;
    border: 3px solid rgba(128, 128, 128, 0.6);
    border-radius: 50%;
    display: flex;
    height: 56px;
    justify-content: center;
    width: 56px;
}
.filament-details {
    flex: 1;
    min-width: 150px;
}
.filament-tool {
    font-size: 15px;
    font-weight: 600;
}
.filament-profile {
    font-size: 13px;
}
.filament-temperature {
    font-size: 11px;
    line-height: 1.4;
}
.filament-actions {
    display: flex;
    flex-direction: column;
    gap: 6px;
    width: 112px;
}
.filament-actions .v-btn {
    font-size: 10px;
    margin: 0;
    width: 100%;
}
.filament-preset-list {
    max-height: 220px;
    overflow-y: auto;
}
.preset-icon {
    font-size: 24px;
}
.color-options {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
}
.color-option {
    border: 2px solid rgba(128, 128, 128, 0.7);
    border-radius: 50%;
    height: 28px;
    width: 28px;
}
.selected-color {
    box-shadow: 0 0 0 2px var(--v-primary-base);
}
.transparent-color {
    background: transparent;
}
@media (max-width: 600px) {
    .filament-head-row {
        align-items: flex-start;
        flex-wrap: wrap;
    }
    .filament-actions {
        margin-left: 80px;
    }
}
</style>
