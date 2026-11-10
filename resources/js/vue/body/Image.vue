<script setup lang="ts">
import { computed, inject } from 'vue'
import { pictureOf, imageClasses } from '../../shared/body'
import { FEED_MEDIA } from '../keys'

const props = defineProps<{
    payload: Record<string, any>
    entityMedia?: Record<string, any> | null
}>()
const caption = computed(() => typeof props.payload.caption === 'string' ? props.payload.caption : null)
// Its own `src`, else the entity's slot it names (see `pictureOf()`).
const picture = computed(() => pictureOf({ $body: 'Storyfeed/Body/Image', ...props.payload }, props.entityMedia))
// A host's media seam (a lightbox, say) draws this picture too; a row's own picture does not navigate.
const mediaComponent = inject(FEED_MEDIA, null)
const pictureClasses = 'block h-auto object-contain max-w-[min(100%,var(--sf-image-width,100%))] max-h-[var(--sf-image-height,none)] rounded-lg'
</script>

<template>
    <figure v-if="picture" :class="['sf-image m-0', imageClasses(payload)]">
        <component v-if="mediaComponent" :is="mediaComponent" :image="picture" :href="null" :link-attributes="{}" :class="[pictureClasses, imageClasses(payload)]" />
        <img v-else class="block h-auto object-contain max-w-[min(100%,var(--sf-image-width,100%))] max-h-[var(--sf-image-height,none)] rounded-lg" :src="picture.src" :alt="picture.alt" :width="picture.width ?? undefined" :height="picture.height ?? undefined" loading="lazy" />
        <figcaption class="mt-2 text-xs leading-[1.6] text-muted-foreground" v-if="caption">{{ caption }}</figcaption>
    </figure>
</template>
