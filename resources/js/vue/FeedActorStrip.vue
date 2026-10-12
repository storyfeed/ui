<script setup lang="ts">
import EntityAvatar from './EntityAvatar.vue'
import type { FeedEntity } from '../shared/types'

/**
 * A group's actor strip: its actors' faces, newest first, as one compact
 * overlapping row of 24px avatars, then a "+N" chip for the actors not shown
 * (ui#48). Each face sits above the one to its right, its ring cutting into
 * that face's edge, never its initials. Each is a member row's face once the group
 * is expanded.
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
    <div v-if="faces.length" class="sf-actor-strip isolate mt-2 flex flex-wrap items-center gap-y-1 pl-0.25">
        <span v-for="(face, i) in faces" :key="i" class="sf-actor-strip__face relative -ml-0.25 flex shrink-0" :class="['z-8', 'z-7', 'z-6', 'z-5', 'z-4', 'z-3', 'z-2', 'z-1'][i] ?? 'z-0'"><EntityAvatar :entity="face" size="sm" /></span>
        <button
            v-if="overflow && toggle"
            type="button"
            :aria-label="toggle.label"
            :aria-expanded="toggle.expanded"
            :aria-controls="toggle.controls"
            class="sf-actor-strip__more -ml-0.25 flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full bg-muted px-1.5 py-0 text-[length:--spacing(2.5)] font-semibold text-muted-foreground ring-2 ring-background select-none cursor-pointer border-0 font-[inherit] hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
            @click="$emit('toggle')"
        >+{{ overflow }}</button>
        <span
            v-else-if="overflow"
            role="img"
            :aria-label="`${overflow} more`"
            class="sf-actor-strip__more -ml-0.25 flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full bg-muted px-1.5 text-[length:--spacing(2.5)] font-semibold text-muted-foreground ring-2 ring-background select-none"
        >+{{ overflow }}</span>
    </div>
</template>
