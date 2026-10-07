<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
    payload: Record<string, any>
    entityMedia?: Record<string, any> | null
}>()
const caption = computed(() => typeof props.payload.caption === 'string' ? props.payload.caption : null)
const picture = computed(() => {
    const slot = props.payload.image ?? 'preview'
    return ['icon', 'preview', 'image'].includes(slot) ? props.entityMedia?.[slot] ?? null : null
})
const alt = computed(() => typeof props.payload.alt === 'string' ? props.payload.alt : caption.value ?? '')
</script>

<template>
    <figure v-if="picture?.src" class="sf-image m-0">
        <img class="block max-w-full rounded-lg" :src="picture.src" :alt="alt" :width="payload.width ?? picture.width" :height="payload.height ?? picture.height" loading="lazy" />
        <figcaption class="mt-2 text-sm leading-[1.6] text-muted-foreground" v-if="caption">{{ caption }}</figcaption>
    </figure>
</template>
