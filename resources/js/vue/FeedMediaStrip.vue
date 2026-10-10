<script setup lang="ts">
import { inject } from 'vue'
import EntityAvatar from './EntityAvatar.vue'
import FeedMedia from './FeedMedia.vue'
import { FEED_LINK } from './keys'
import { linkProps } from '../shared/link'

/**
 * A group's strip: one rounded-square tile per member activity, all the same
 * size and spaced, never overlapped (ui#27). A tile is the picture of what the
 * member features, else that entity's avatar, its initials on its colour; the
 * "+N" tile counts the members not shown. Each tile links to its entity.
 *
 * Build the tiles with `strip()` in `shared/strip.ts`. A tile without an
 * `entity` (an app's own `{ image, href }`) is drawn as a picture.
 */
defineProps<{
    tiles: Array<Record<string, any>>
    overflow?: number | null
    /** When the group can open, the "+N" tile opens and closes it like its own toggle (ui#27). */
    toggle?: { expanded: boolean; controls: string; label: string } | null
}>()
defineEmits<{ toggle: [] }>()

const linkComponent = inject(FEED_LINK, 'a')
const tileClass = 'mt-0! aspect-square! size-full! max-w-none! rounded-lg!'
</script>

<template>
    <div v-if="tiles.length" class="sf-media-strip mt-2 grid max-w-88 grid-cols-4 gap-1">
        <template v-for="(tile, i) in tiles" :key="i">
            <FeedMedia v-if="tile.image" :image="tile.image" :href="tile.href" :link-attributes="tile.linkAttributes" :class="tileClass" />
            <component
                :is="linkComponent"
                v-else-if="tile.link"
                v-bind="linkProps(tile.link, linkComponent)"
                class="sf-media-strip__link flex rounded-lg focus-visible:outline-2 focus-visible:outline-ring"
            ><EntityAvatar :entity="tile.entity" size="tile" /></component>
            <EntityAvatar v-else :entity="tile.entity" size="tile" />
        </template>
        <button
            v-if="overflow && toggle"
            type="button"
            :aria-label="toggle.label"
            :aria-expanded="toggle.expanded"
            :aria-controls="toggle.controls"
            class="sf-media-strip__more flex aspect-square items-center justify-center rounded-lg bg-muted text-[length:--spacing(4)] font-semibold text-muted-foreground select-none cursor-pointer border-0 p-0 font-[inherit] hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
            @click="$emit('toggle')"
        >+{{ overflow }}</button>
        <span
            v-else-if="overflow"
            role="img"
            :aria-label="`${overflow} more`"
            class="sf-media-strip__more flex aspect-square items-center justify-center rounded-lg bg-muted text-[length:--spacing(4)] font-semibold text-muted-foreground select-none"
        >+{{ overflow }}</span>
    </div>
</template>
