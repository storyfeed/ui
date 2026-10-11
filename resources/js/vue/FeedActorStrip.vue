<script setup lang="ts">
import EntityAvatar from './EntityAvatar.vue'
import type { FeedEntity } from '../shared/types'

/**
 * A group's actor strip: its actors' faces, newest first, as one compact
 * overlapping row of 24px avatars, then a "+N" chip for the actors not shown
 * (ui#48). Each face is a member row's face once the group is expanded.
 *
 * Build the faces with `actorStrip()` in `shared/actors.ts`.
 */
defineProps<{
    faces: FeedEntity[]
    overflow?: number | null
    /** When the group can open, the "+N" chip opens and closes it like its own toggle. */
    toggle?: { expanded: boolean; controls: string; label: string } | null
}>()
defineEmits<{ toggle: [] }>()
</script>

<template>
    <div v-if="faces.length" class="sf-actor-strip mt-2 flex items-center pl-1.25">
        <span v-for="(face, i) in faces" :key="i" class="sf-actor-strip__face -ml-1.25 flex"><EntityAvatar :entity="face" size="sm" /></span>
        <button
            v-if="overflow && toggle"
            type="button"
            :aria-label="toggle.label"
            :aria-expanded="toggle.expanded"
            :aria-controls="toggle.controls"
            class="sf-actor-strip__more -ml-1.25 flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full bg-muted px-1.5 py-0 text-[length:--spacing(2.5)] font-semibold text-muted-foreground ring-2 ring-background select-none cursor-pointer border-0 font-[inherit] hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
            @click="$emit('toggle')"
        >+{{ overflow }}</button>
        <span
            v-else-if="overflow"
            role="img"
            :aria-label="`${overflow} more`"
            class="sf-actor-strip__more -ml-1.25 flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full bg-muted px-1.5 text-[length:--spacing(2.5)] font-semibold text-muted-foreground ring-2 ring-background select-none"
        >+{{ overflow }}</span>
    </div>
</template>
