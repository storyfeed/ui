<script setup lang="ts">
import { computed } from 'vue'
import type { ResolvedLink } from '../../shared/link'

const props = defineProps<{
    payload: Record<string, any>
    entityLabel?: string | null
    entityUrl?: string | null
    entityMedia?: Record<string, any> | null
    entityLink?: ResolvedLink | null
}>()
const intent = computed(() => ['info', 'success', 'warning', 'danger'].includes(props.payload.intent) ? props.payload.intent : 'note')
</script>

<template>
    <aside :data-sf-intent="intent" class="sf-callout min-w-0 max-w-128 rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm leading-[1.6] text-foreground [overflow-wrap:anywhere] data-[sf-intent=info]:border-sky-500/25 data-[sf-intent=info]:bg-sky-500/5 data-[sf-intent=info]:text-sky-800 dark:data-[sf-intent=info]:bg-sky-500/10 dark:data-[sf-intent=info]:text-sky-200 data-[sf-intent=success]:border-emerald-500/25 data-[sf-intent=success]:bg-emerald-500/5 data-[sf-intent=success]:text-emerald-800 dark:data-[sf-intent=success]:bg-emerald-500/10 dark:data-[sf-intent=success]:text-emerald-200 data-[sf-intent=warning]:border-amber-500/25 data-[sf-intent=warning]:bg-amber-500/5 data-[sf-intent=warning]:text-amber-800 dark:data-[sf-intent=warning]:bg-amber-500/10 dark:data-[sf-intent=warning]:text-amber-200 data-[sf-intent=danger]:border-red-500/25 data-[sf-intent=danger]:bg-red-500/5 data-[sf-intent=danger]:text-red-800 dark:data-[sf-intent=danger]:bg-red-500/10 dark:data-[sf-intent=danger]:text-red-200">
        <p v-if="typeof payload.title === 'string' && payload.title !== ''" class="sf-callout__title m-0 mb-1 font-semibold">{{ payload.title }}</p>
        <p class="sf-callout__content m-0 whitespace-pre-wrap">{{ payload.content ?? '' }}</p>
    </aside>
</template>
