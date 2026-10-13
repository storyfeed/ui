<script setup lang="ts">
/**
 * One picture, at the feed's scale.
 *
 * The image object is core's `FeedImage`, minted by the resolver at READ time,
 * so the src is current however old the row is. `width` and `height` are
 * advisory: they reserve the box before the bytes arrive, which is what stops
 * a feed jumping as photos load.
 *
 * A tile in a group's strip is the other caller, and it differs in one way: a
 * tile stands for an entity and keeps that entity's link, where a row's own
 * picture does not navigate — the payload's `entity.url` for a photo IS the
 * full file, so tapping one would leave the feed for a raw image.
 */
import { computed, inject } from 'vue'
import { imageClasses } from '../shared/body'
import { linkAttributes as filterAttributes } from '../shared/linkAttributes'
import { FEED_LINK, FEED_MEDIA } from './keys'

const props = defineProps<{ image: Record<string, any>; payload?: Record<string, any>; href?: string | null; linkAttributes?: Record<string, unknown> }>()
// Feed limits inherit through CSS; a custom Image renderer passes its body to override them.
const classes = computed(() => ['sf-media mt-2 block w-fit max-w-[min(100%,var(--sf-image-width,22rem))] overflow-hidden rounded-lg [&>img]:block [&>img]:w-auto [&>img]:h-auto [&>img]:object-contain [&>img]:max-w-full [&>img]:max-h-[var(--sf-image-height,none)]', imageClasses(props.payload ?? {})])

// The same seam an entity link uses, so a docs page can make a tile inert and
// an app can hand it a router component.
const linkComponent = inject(FEED_LINK, 'a')
const mediaComponent = inject(FEED_MEDIA, null)
</script>

<template>
    <component v-if="mediaComponent" :is="mediaComponent" :image="image" :href="href" :link-attributes="href ? filterAttributes(linkAttributes) : {}" :class="classes" />
    <component
        v-else
        v-bind="href ? filterAttributes(linkAttributes) : {}"
        :is="href ? linkComponent : 'div'"
        :href="href || undefined"
        :class="classes"
    >
        <!-- Load documentation previews before scrolling or printing the page. -->
        <img
            :src="image.src"
            :alt="image.alt ?? ''"
            :width="image.width"
            :height="image.height"
            loading="eager"
        />
    </component>
</template>
