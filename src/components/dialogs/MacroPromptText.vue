<template>
    <v-row>
        <v-col>
            <p class="mb-0">
                <template v-for="(part, index) in textParts">
                    <strong v-if="part.bold" :key="index">{{ part.text }}</strong>
                    <span v-else :key="index">{{ part.text }}</span>
                </template>
            </p>
        </v-col>
    </v-row>
</template>

<script lang="ts">
import { Component, Mixins, Prop } from 'vue-property-decorator'
import BaseMixin from '@/components/mixins/base'
import { ServerStateEventPromptContent } from '@/store/server/types'

@Component({})
export default class MacroPromptText extends Mixins(BaseMixin) {
    @Prop({ type: Object, required: true }) readonly event!: ServerStateEventPromptContent

    get textParts() {
        return this.event.message
            .split(/(\*\*[^*]+\*\*)/)
            .filter(Boolean)
            .map((part) => ({
                bold: part.startsWith('**') && part.endsWith('**'),
                text: part.startsWith('**') && part.endsWith('**') ? part.slice(2, -2) : part,
            }))
    }
}
</script>
