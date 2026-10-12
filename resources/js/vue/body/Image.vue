<script setup lang="ts">
import { computed } from 'vue'
import { pictureOf, imageClasses } from '../../shared/body'

const props = defineProps<{
    payload: Record<string, any>
    entityMedia?: Record<string, any> | null
}>()
const caption = computed(() => typeof props.payload.caption === 'string' ? props.payload.caption : null)
// Its own `src`, else the entity's slot it names (see `pictureOf()`).
const picture = computed(() => pictureOf({ $body: 'Storyfeed/Body/Image', ...props.payload }, props.entityMedia))
</script>

<template>
    <figure v-if="picture" :class="['sf-image m-0', imageClasses(payload)]">
        <img class="block h-auto object-contain max-w-[min(100%,var(--sf-image-width,100%))] max-h-[var(--sf-image-height,none)] rounded-lg" :src="picture.src" :alt="picture.alt" :width="picture.width ?? undefined" :height="picture.height ?? undefined" loading="lazy" />
        <figcaption class="mt-2 text-xs leading-[1.6] text-muted-foreground" v-if="caption">{{ caption }}</figcaption>
    </figure>
</template>
