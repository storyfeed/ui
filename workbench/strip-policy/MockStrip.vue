<script setup lang="ts">
import FeedMedia from '../../resources/js/vue/FeedMedia.vue'
import type { MockTile } from './policy'

/**
 * A workbench-only mock of the kit's strip with a quiet name tile for members
 * without a picture (not in the kit). Same grid, size and "+N" tile as
 * `FeedMediaStrip`; the name tile holds the whole label, clamped to three lines.
 */
defineProps<{ tiles: MockTile[]; overflow: number }>()
const tileClass = 'mt-0! aspect-square! size-full! max-w-none! rounded-lg!'
</script>

<template>
    <div class="sf-media-strip mt-2 grid max-w-88 grid-cols-4 gap-1">
        <template v-for="(tile, i) in tiles" :key="i">
            <FeedMedia v-if="tile.image" :image="tile.image" :class="tileClass" />
            <span v-else class="sf-name-tile flex aspect-square min-w-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-background p-1.5 text-center">
                <span class="line-clamp-3 text-[11px] leading-[1.3] break-words text-muted-foreground [hyphens:auto]" :title="tile.label">{{ tile.label }}</span>
            </span>
        </template>
        <span v-if="overflow > 0" role="img" :aria-label="`${overflow} more`" class="sf-media-strip__more flex aspect-square items-center justify-center rounded-lg bg-muted text-[length:--spacing(4)] font-semibold text-muted-foreground select-none">+{{ overflow }}</span>
    </div>
</template>
