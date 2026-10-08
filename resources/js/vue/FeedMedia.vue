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
import { inject } from 'vue'
import { linkAttributes as filterAttributes } from '../shared/linkAttributes'
import { FEED_LINK, FEED_MEDIA } from './keys'

defineProps<{ image: Record<string, any>; href?: string | null; linkAttributes?: Record<string, unknown> }>()

// The same seam an entity link uses, so a docs page can make a tile inert and
// an app can hand it a router component.
const linkComponent = inject(FEED_LINK, 'a')
const mediaComponent = inject(FEED_MEDIA, null)
</script>

<template>
    <component v-if="mediaComponent" :is="mediaComponent" :image="image" :href="href" :link-attributes="href ? filterAttributes(linkAttributes) : {}" class="sf-media mt-2 block max-w-[22rem] overflow-hidden rounded-lg bg-muted" />
    <component
        v-else
        v-bind="href ? filterAttributes(linkAttributes) : {}"
        :is="href ? linkComponent : 'div'"
        :href="href || undefined"
        class="sf-media mt-2 block max-w-[22rem] overflow-hidden rounded-lg bg-muted"
        :style="image.width && image.height ? { aspectRatio: `${image.width} / ${image.height}` } : undefined"
    >
        <!-- Load documentation previews before scrolling or printing the page. -->
        <img class="block size-full object-cover"
            :src="image.src"
            :alt="image.alt ?? ''"
            :width="image.width"
            :height="image.height"
            loading="eager"
        />
    </component>
</template>
