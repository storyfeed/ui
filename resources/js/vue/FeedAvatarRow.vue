<script setup lang="ts">
import { inject } from 'vue'
import EntityAvatar from './EntityAvatar.vue'
import { FEED_LINK } from './keys'
import { entityLink, linkProps } from '../shared/link'
import type { FeedEntity } from '../shared/types'

/**
 * A group's featured entities, as a row of their avatars: "Ana added Ben,
 * Cara and 2 others". Each avatar links to its entity and is labelled with its
 * name; the overflow disc counts the ones not sampled.
 */
defineProps<{ entities: FeedEntity[]; overflow?: number }>()

const linkComponent = inject(FEED_LINK, 'a')
</script>

<template>
    <div class="sf-avatar-row mt-2 flex items-center [&>*+*]:-ml-1">
        <template v-for="(entity, i) in entities" :key="i">
            <component
                :is="linkComponent"
                v-if="entityLink(entity)"
                v-bind="linkProps(entityLink(entity)!, linkComponent)"
                class="sf-avatar-row__link flex shrink-0 rounded-full focus-visible:outline-2 focus-visible:outline-ring"
            ><EntityAvatar :entity="entity" /></component>
            <EntityAvatar v-else :entity="entity" />
        </template>
        <span
            v-if="overflow"
            role="img"
            :aria-label="`${overflow} more`"
            class="sf-avatar-row__more flex size-[var(--sf-disc,--spacing(8))] shrink-0 items-center justify-center rounded-full bg-border text-xs font-semibold text-foreground select-none ring-2 ring-background"
        >+{{ overflow }}</span>
    </div>
</template>
