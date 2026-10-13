<script setup lang="ts">
import type { ResolvedLink } from '../../shared/link'

defineProps<{
    payload: Record<string, any>
    entityLabel?: string | null
    entityUrl?: string | null
    entityMedia?: Record<string, any> | null
    entityLink?: ResolvedLink | null
}>()
</script>

<template>
    <figure class="sf-code-block m-0 min-w-0 max-w-144">
        <figcaption v-if="typeof payload.title === 'string' && payload.title !== ''" class="sf-code__title mb-2 text-sm font-semibold text-foreground">{{ payload.title }}</figcaption>
        <div class="sf-code__prose prose max-w-none text-[length:var(--text-sm)] [--tw-prose-pre-code:var(--color-foreground)] [--tw-prose-pre-bg:var(--color-muted)]">
            <pre class="sf-code m-0 max-h-[var(--sf-prose-max-h,--spacing(96))] overflow-auto rounded-lg px-4 py-3 font-mono text-[length:1em] leading-[1.55] whitespace-pre" tabindex="0"><code v-bind="typeof payload.language === 'string' && payload.language !== '' ? { class: `language-${payload.language}` } : {}">{{ payload.source ?? '' }}</code></pre>
        </div>
    </figure>
</template>
