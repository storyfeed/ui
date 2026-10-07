<script setup lang="ts">
import { computed } from 'vue'
import FeedMedia from './FeedMedia.vue'

/**
 * A collapsed group's sample of photographs.
 *
 * The tile count lives on the CONTAINER and the stylesheet turns it into
 * widths, because "fewer photos get bigger tiles" and "no row is left holding
 * a single tile" are both statements about a row. A per-tile class would be
 * the same fact written N times and able to disagree with itself.
 *
 * The overflow tile consumes a slot rather than adding one, so it is inside
 * the count. It is an empty tile with a number in it, never a badge stamped
 * over someone's picture.
 */
const props = defineProps<{ tiles: Array<Record<string, any>>; overflow?: number | null }>()

const count = computed(() => props.tiles.length + (props.overflow ? 1 : 0))
</script>

<template>
    <div v-if="tiles.length" class="sf-media-strip mt-2 flex max-w-[22rem] flex-wrap gap-1" :class="`sf-media-strip--tiles-${count}`">
        <FeedMedia v-for="(tile, i) in tiles" :key="i" :image="tile.image" :href="tile.href" class="mt-0! min-w-0 max-w-none!" :class="[1, 2, 4].includes(count) ? 'flex-[1_1_calc(50%-2px)]' : [3, 5, 6].includes(count) ? 'flex-[1_1_calc(33.333%-3px)]' : 'flex-1'" />
        <div v-if="overflow" class="sf-media-strip__more flex min-h-14 flex-[1_1_calc(33.333%-3px)] items-center justify-center rounded-lg bg-muted text-[13px] text-muted-foreground">+{{ overflow }} more</div>
    </div>
</template>
