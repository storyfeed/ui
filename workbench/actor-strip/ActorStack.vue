<script setup lang="ts">
import EntityAvatar from '../../resources/js/vue/EntityAvatar.vue'
import type { FeedEntity } from '../../resources/js/shared/types'

/**
 * A workbench-only mock of the actor strip (ui#48): the actors' faces as a
 * compact, overlapping stack, then a "+N" disc for the actors not shown. Drawn
 * from the kit's own EntityAvatar, so portraits and initials match the rail.
 */
const props = withDefaults(defineProps<{ faces: FeedEntity[]; overflow: number; size?: number }>(), { size: 24 })
const overlap = Math.round(props.size / 5)
</script>

<template>
    <div class="sf-actor-stack mt-2 flex items-center" :style="{ paddingLeft: `${overlap}px` }">
        <span v-for="face in faces" :key="face.id" class="flex" :style="{ marginLeft: `-${overlap}px` }">
            <EntityAvatar :entity="face" size="sm" class="size-(--face)! text-[length:calc(var(--face)*3/8)]!" :style="{ '--face': `${size}px` }" />
        </span>
        <span
            v-if="overflow > 0"
            role="img"
            :aria-label="`${overflow} more`"
            class="sf-actor-stack__more flex shrink-0 items-center justify-center rounded-full bg-muted px-[calc(var(--face)/4)] font-semibold text-muted-foreground ring-2 ring-background select-none h-(--face) min-w-(--face) text-[length:calc(var(--face)*5/12)]"
            :style="{ '--face': `${size}px`, marginLeft: `-${overlap}px` }"
        >+{{ overflow }}</span>
    </div>
</template>
