<script setup lang="ts">
import { computed, inject } from 'vue'
import { FEED_FILE_LABELLER } from '../keys'
import { fileLabel } from '../fileLabels'

/**
 * `Storyfeed/Body/FileAttachment` — what an artefact is and how big, never its URL.
 *
 * The supplied filename is always visible. Core currently carries no kind
 * label; the kind is presentation owned by the MIME map or the host labeller.
 */
const props = defineProps<{ payload: Record<string, any>; entityLabel?: string | null }>()

const labeller = inject(FEED_FILE_LABELLER, null)
const kind = computed(() => fileLabel({ name: props.payload.name ?? null, mediaType: props.payload.mediaType ?? null }, labeller))

const human = (bytes: unknown) => {
    if (typeof bytes !== 'number') return null
    const units = ['bytes', 'KB', 'MB', 'GB']
    let value = bytes
    let unit = 0
    while (value >= 1000 && unit < units.length - 1) { value /= 1000; unit++ }

    return `${unit === 0 ? value : value.toFixed(value < 10 ? 1 : 0)} ${units[unit]}`
}

const description = computed(() => [kind.value, human(props.payload.size)].filter(Boolean).join(' · '))
</script>

<template>
    <p v-if="payload.name || description" class="sf-file m-0 text-[13.5px] text-muted-foreground">{{ [payload.name, description].filter(Boolean).join(' ') }}</p>
</template>
