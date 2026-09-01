<template>
    <panel
        :icon="mdiVolumeHigh"
        :title="$t('Panels.PrinterSoundPanel.Headline')"
        :collapsible="true"
        card-class="printer-sound-panel">
        <v-container>
            <v-slider
                v-model="config.volume"
                :label="$t('Panels.PrinterSoundPanel.Volume')"
                min="0"
                max="100"
                thumb-label
                hide-details
                class="mb-4"
                @change="saveConfig" />
            <v-file-input
                v-model="uploadFile"
                accept="audio/wav,.wav"
                :label="$t('Panels.PrinterSoundPanel.Upload')"
                prepend-icon=""
                :prepend-inner-icon="mdiUpload"
                outlined
                dense
                show-size
                :loading="uploading"
                @change="upload" />
            <v-list v-if="uploadedSounds.length" dense class="mb-3 py-0">
                <v-subheader class="px-0">{{ $t('Panels.PrinterSoundPanel.UploadedSounds') }}</v-subheader>
                <v-list-item v-for="sound in uploadedSounds" :key="sound.name" class="px-0">
                    <v-list-item-content>
                        <v-list-item-title>{{ sound.name }}</v-list-item-title>
                    </v-list-item-content>
                    <v-list-item-action>
                        <v-btn icon :title="$t('Panels.PrinterSoundPanel.Delete')" @click="deleteSound(sound.name)">
                            <v-icon>{{ mdiDelete }}</v-icon>
                        </v-btn>
                    </v-list-item-action>
                </v-list-item>
            </v-list>
            <v-row v-for="entry in eventRows" :key="entry.event" dense align="center">
                <v-col cols="5" sm="4">
                    <v-switch
                        v-model="config.events[entry.event].enabled"
                        :label="entry.label"
                        hide-details
                        class="mt-0"
                        @change="saveConfig" />
                </v-col>
                <v-col>
                    <v-select
                        v-model="config.events[entry.event].sound"
                        :items="sounds"
                        item-text="name"
                        item-value="name"
                        :label="$t('Panels.PrinterSoundPanel.Sound')"
                        clearable
                        hide-details
                        outlined
                        dense
                        @change="saveConfig" />
                </v-col>
                <v-col cols="auto">
                    <v-btn
                        icon
                        :title="$t('Panels.PrinterSoundPanel.Preview')"
                        :disabled="!config.events[entry.event].sound"
                        @click="preview(config.events[entry.event].sound)">
                        <v-icon>{{ mdiPlay }}</v-icon>
                    </v-btn>
                </v-col>
            </v-row>
            <div v-if="error" class="error--text text-caption mt-2">{{ error }}</div>
        </v-container>
    </panel>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator'
import { mdiDelete, mdiPlay, mdiUpload, mdiVolumeHigh } from '@mdi/js'
import BaseMixin from '@/components/mixins/base'
import Panel from '@/components/ui/Panel.vue'

type SoundEvent = 'error' | 'warning' | 'finished' | 'heated'
type SoundEntry = { enabled: boolean; sound: string }
type SoundConfig = { volume: number; events: Record<SoundEvent, SoundEntry> }
type SoundFile = { name: string; builtin: boolean; duration: number; channels: number; rate: number }

const defaultConfig = (): SoundConfig => ({
    volume: 50,
    events: {
        error: { enabled: false, sound: 'error.wav' },
        warning: { enabled: false, sound: 'warning.wav' },
        finished: { enabled: false, sound: 'finished.wav' },
        heated: { enabled: false, sound: 'heated.wav' },
    },
})

@Component({ components: { Panel } })
export default class PrinterSoundPanel extends Mixins(BaseMixin) {
    mdiPlay = mdiPlay
    mdiDelete = mdiDelete
    mdiUpload = mdiUpload
    mdiVolumeHigh = mdiVolumeHigh
    config: SoundConfig = defaultConfig()
    sounds: SoundFile[] = []
    uploadFile: File | null = null
    uploading = false
    error = ''

    get eventRows(): { event: SoundEvent; label: string }[] {
        return (['error', 'warning', 'finished', 'heated'] as SoundEvent[]).map((event) => ({
            event,
            label: this.$t(`Panels.PrinterSoundPanel.Events.${event}`).toString(),
        }))
    }

    get uploadedSounds(): SoundFile[] {
        return this.sounds.filter((sound) => !sound.builtin)
    }

    mounted(): void {
        this.loadConfig()
    }

    async loadConfig(): Promise<void> {
        try {
            const response = await fetch('/sound-api/config')
            if (!response.ok) throw new Error(await response.text())
            const value = await response.json()
            this.config = { volume: value.volume, events: value.events }
            this.sounds = value.sounds
            this.error = ''
        } catch {
            this.error = this.$t('Panels.PrinterSoundPanel.Unavailable').toString()
        }
    }

    async saveConfig(): Promise<boolean> {
        try {
            const response = await fetch('/sound-api/config', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(this.config),
            })
            if (!response.ok) throw new Error(await response.text())
            this.error = ''
            return true
        } catch {
            this.error = this.$t('Panels.PrinterSoundPanel.SaveFailed').toString()
            return false
        }
    }

    async upload(file: File | null): Promise<void> {
        if (!file) return
        this.uploading = true
        try {
            const response = await fetch(`/sound-api/sounds/${encodeURIComponent(file.name)}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'audio/wav' },
                body: file,
            })
            if (!response.ok) throw new Error(await response.text())
            this.uploadFile = null
            await this.loadConfig()
        } catch {
            this.error = this.$t('Panels.PrinterSoundPanel.UploadFailed').toString()
        } finally {
            this.uploading = false
        }
    }

    async preview(sound: string): Promise<void> {
        try {
            const response = await fetch('/sound-api/preview', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sound }),
            })
            if (!response.ok) throw new Error(await response.text())
            const value = await response.json()
            if (!value.queued) throw new Error('Preview was not queued')
            this.error = ''
        } catch {
            this.error = this.$t('Panels.PrinterSoundPanel.PreviewFailed').toString()
        }
    }

    async deleteSound(name: string): Promise<void> {
        try {
            Object.values(this.config.events).forEach((entry) => {
                if (entry.sound === name) entry.sound = ''
            })
            if (!(await this.saveConfig())) return
            const response = await fetch(`/sound-api/sounds/${encodeURIComponent(name)}`, { method: 'DELETE' })
            if (!response.ok) throw new Error(await response.text())
            await this.loadConfig()
        } catch {
            this.error = this.$t('Panels.PrinterSoundPanel.DeleteFailed').toString()
        }
    }
}
</script>
