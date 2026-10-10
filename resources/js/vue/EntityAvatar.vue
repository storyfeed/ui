<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { darkText, declaredColor } from '../shared/avatar';
import type { FeedEntity } from '../shared/types';

const props = withDefaults(
    defineProps<{
        entity: FeedEntity | null;
        /**
         * `badge` is the face on a flipped rail's corner. It shows ONE letter:
         * two initials in an 18px disc is a smudge, and the picture a badge
         * draws is of a person, not of their spelling. The whole label stays on
         * `aria-label` and `title`, so nothing is lost to a reader who needs it.
         */
        /** `pair` is one face of a rail's diagonal pair (ui#25). */
        size?: 'sm' | 'md' | 'badge' | 'pair';
    }>(),
    { size: 'md' },
);

const FALLBACK_COLORS = [
    '#0ea5e9',
    '#8b5cf6',
    '#ec4899',
    '#f59e0b',
    '#10b981',
    '#ef4444',
    '#6366f1',
    '#14b8a6',
];

// An entity's icon is its face when it has one; a broken image falls back to
// initials rather than an empty disc.
// A deleted entity stays a grey disc, so it never shows its former icon.
const icon = computed(() =>
    props.entity?.tombstone ? undefined : props.entity?.media?.icon?.src,
);
const imageFailed = ref(false);
watch(icon, () => {
    imageFailed.value = false;
});

// The entity's declared initials, then the older snapshot convention, then
// initials derived from the label.
const initials = computed(() => {
    const declared = props.entity?.media?.initials;
    const provided = typeof declared === 'string' && declared.length > 0 ? declared : props.entity?.data?.initials;

    if (typeof provided === 'string' && provided.length > 0) {
        return props.size === 'badge' || props.size === 'pair' ? provided.slice(0, 1) : provided;
    }

    const label = props.entity?.label ?? '?';

    return (
        label
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, props.size === 'badge' || props.size === 'pair' ? 1 : 2)
            .map((word) => word[0]!.toUpperCase())
            .join('') || '?'
    );
});

// The declared disc colour, else one the entity carries in its snapshot
// data; otherwise derive one
// deterministically so the same entity is always the same color — and so the
// server and the client agree, which a random pick would not.
const color = computed(() => {
    // Tombstones use the muted theme token; never apply their former colour.
    if (props.entity?.tombstone) {
        return null;
    }

    const declared = declaredColor(props.entity?.media);

    if (declared) {
        return declared;
    }

    const provided = props.entity?.data?.avatar_color;

    if (typeof provided === 'string' && provided.length > 0) {
        return provided;
    }

    const key = `${props.entity?.type ?? ''}:${props.entity?.id ?? ''}`;
    let hash = 0;

    for (const char of key) {
        hash = (hash * 31 + char.charCodeAt(0)) | 0;
    }

    return FALLBACK_COLORS[Math.abs(hash) % FALLBACK_COLORS.length] ?? null;
});

// A declared colour gets the text with the better contrast; the fallback
// palette and the older snapshot colour keep white.
const text = computed(() => {
    const declared = props.entity?.tombstone ? null : declaredColor(props.entity?.media);

    return declared && darkText(declared) ? 'text-black' : 'text-white';
});
</script>

<template>
    <span
        role="img"
        :aria-label="entity?.label ?? 'Someone'"
        :title="entity?.label ?? 'Someone'"
        class="sf-avatar flex shrink-0 items-center justify-center rounded-full font-semibold select-none ring-2 ring-background"
        :class="[{ 'sf-avatar--md size-[var(--sf-disc,--spacing(8))] text-xs': size === 'md', 'sf-avatar--sm size-6 text-[length:--spacing(2.5)]': size === 'sm', 'sf-avatar--pair size-full text-[length:--spacing(2.75)]': size === 'pair', 'sf-avatar--badge [--sf-badge:var(--sf-badge-face)] absolute top-[calc(var(--sf-disc)-var(--sf-badge)+--spacing(0.5))] left-[calc(50%+var(--sf-disc)/2-var(--sf-badge))] size-(--sf-badge) text-[length:--spacing(2.25)]': size === 'badge' }, entity?.tombstone ? 'bg-muted text-white' : color ? text : 'bg-primary text-primary-foreground']"
        :style="color ? { backgroundColor: color } : undefined"
    >
        <img
            v-if="icon && !imageFailed"
            :src="icon"
            :alt="entity?.media?.icon?.alt ?? entity?.label ?? 'Someone'"
            class="sf-avatar__image block size-full rounded-full object-contain"
            @error="imageFailed = true"
        />
        <template v-else>{{ initials }}</template>
    </span>
</template>
