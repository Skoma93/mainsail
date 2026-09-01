<template>
    <responsive
        :breakpoints="{
            small: (el) => el.width <= 350,
            medium: (el) => el.width > 350 && el.width <= 500,
        }">
        <template #default="{ el }">
            <v-container>
                <pressure-advance-settings :extruder="activeExtruder" :is-small="el.is.small" />
            </v-container>
        </template>
    </responsive>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator'
import BaseMixin from '@/components/mixins/base'
import Responsive from '@/components/ui/Responsive.vue'

@Component({
    components: { Responsive },
})
export default class ExtruderPressureAdvanceSettings extends Mixins(BaseMixin) {
    get activeExtruder(): string {
        return this.$store.getters['printer/getActiveExtruder']
    }
}
</script>
