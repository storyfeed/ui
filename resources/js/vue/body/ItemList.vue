<script setup lang="ts">
import { computed, inject } from 'vue'
import { FEED_LINK } from '../keys'

/**
 * `Storyfeed/Body/ItemList` — several things, each a name and maybe a link.
 *
 * An item is a string or a link, stored as the union rather than flattened,
 * because text that leads nowhere and text that leads somewhere are different
 * facts. `ordered` says whether the sequence carries meaning; the numbering
 * is this renderer's answer to that fact, not an instruction from the payload.
 *
 * HOW MANY TO SHOW IS NOT IN THE PAYLOAD and never will be — a threshold
 * depends on the viewport, which a server cannot know. `totalItems` says how
 * many exist when more were not sent, and `more` is where those live.
 */
const props = defineProps<{
    payload: Record<string, any>
    entityUrl?: string | null
}>()

const linkComponent = inject(FEED_LINK, 'a')

const link = (value: any) => typeof value === 'string'
    ? { label: value, href: null }
    : { label: value.label, href: value.href ?? props.entityUrl ?? null }
const items = computed(() => (props.payload.items ?? []).filter(Boolean).map(link))
const more = computed(() => props.payload.more ? link(props.payload.more) : null)
const remaining = computed(() => {
    const total = props.payload.totalItems
    return typeof total === 'number' ? Math.max(total - items.value.length, 0) : 0
})
</script>

<template>
    <figure v-if="items.length" class="sf-list-block m-0 min-w-0 max-w-144 rounded-lg bg-card px-4 py-3">
        <figcaption v-if="payload.title" class="sf-list__title mb-1 text-sm text-foreground">{{ payload.title }}</figcaption>

        <component :is="payload.ordered ? 'ol' : 'ul'" :class="payload.ordered ? 'list-decimal' : 'list-disc'" class="sf-list m-0 pl-4.5 text-base leading-[1.6]">
            <li v-for="(item, index) in items" :key="index" class="sf-list__item m-0">
                <component
                    :is="linkComponent"
                    v-if="item.href"
                    :href="item.href"
                    class="sf-entity font-medium text-foreground no-underline underline-offset-2 hover:underline"
                >{{ item.label }}</component>
                <template v-else>{{ item.label }}</template>
            </li>
        </component>

        <figcaption v-if="remaining || more" class="sf-list__more mt-1 flex gap-2 text-sm text-muted-foreground">
            <span v-if="remaining">and {{ remaining }} more</span>
            <component
                :is="linkComponent"
                v-if="more?.href"
                :href="more.href"
                class="sf-entity font-medium text-foreground no-underline underline-offset-2 hover:underline"
            >{{ more.label }}</component>
            <span v-else-if="more">{{ more.label }}</span>
        </figcaption>
    </figure>
</template>
