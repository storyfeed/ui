<script setup lang="ts">
/** `Storyfeed/Body/Excerpt` — a passage, and where it came from. */
defineProps<{ payload: Record<string, any> }>()
</script>

<template>
    <figure v-if="payload.text" class="sf-excerpt-block m-0">
        <blockquote class="sf-excerpt m-0 border-l-2 border-border pl-3 text-[13.5px] whitespace-pre-wrap text-muted-foreground italic">
            {{ payload.text }}<span v-if="payload.truncated" aria-hidden="true">…</span>
        </blockquote>
        <figcaption v-if="payload.from" class="sf-excerpt__from mt-0.5 text-[12.5px] text-muted-foreground">{{ payload.from }}</figcaption>
    </figure>
</template>
