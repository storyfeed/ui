<script setup lang="ts">
import { computed } from 'vue'
import { isRich, renderProse } from '../../shared/prose'

/** Parse recognised formats only. Verbatim always preserves escaped source. */
const props = defineProps<{ payload: Record<string, any> }>()
const rich = computed(() => isRich(props.payload))
const rendered = computed(() => renderProse(props.payload))
</script>

<template>
    <figure v-if="payload.content" class="sf-prose-block m-0 min-w-0 max-w-144" :class="payload.verbatim ? 'sf-prose-block--verbatim' : 'rounded-lg bg-card px-4 py-3'">
        <figcaption v-if="payload.title" class="sf-prose__title mb-2 text-sm font-medium text-foreground">{{ payload.title }}</figcaption>
        <!-- Code needs a dark surface in both themes; foreground/background tokens invert, so this variant keeps it dark. -->
        <pre v-if="payload.verbatim" class="sf-verbatim m-0 max-h-[var(--sf-prose-max-h,--spacing(96))] overflow-auto rounded-lg bg-foreground px-4 py-3 font-mono text-sm leading-[1.55] whitespace-pre-wrap text-background dark:bg-background dark:text-foreground [overflow-wrap:anywhere] [&_code]:bg-transparent [&_code]:p-0 [&_code]:font-[inherit] [&_code]:text-inherit" tabindex="0"><code>{{ payload.content }}</code></pre>
        <div v-else-if="rich" class="sf-rich-text prose max-w-none text-[length:inherit] [overflow-wrap:anywhere] [--tw-prose-body:var(--color-muted-foreground)] [--tw-prose-headings:var(--color-foreground)] [--tw-prose-lead:var(--color-muted-foreground)] [--tw-prose-links:var(--color-primary)] [--tw-prose-bold:var(--color-foreground)] [--tw-prose-counters:var(--color-muted-foreground)] [--tw-prose-bullets:var(--color-muted-foreground)] [--tw-prose-hr:var(--color-border)] [--tw-prose-quotes:var(--color-foreground)] [--tw-prose-quote-borders:var(--color-border)] [--tw-prose-captions:var(--color-muted-foreground)] [--tw-prose-kbd:var(--color-foreground)] [--tw-prose-code:var(--color-foreground)] [--tw-prose-pre-code:var(--color-foreground)] [--tw-prose-pre-bg:var(--color-border)] [--tw-prose-th-borders:var(--color-border)] [--tw-prose-td-borders:var(--color-border)] [&_li:has(>input)]:list-none [&_li>input]:my-0 [&_li>input]:-ms-[1.5em] [&_li>input]:me-[0.5em] [&_[align=center]]:text-center [&_[align=right]]:text-right [&_pre]:max-h-[var(--sf-prose-max-h,--spacing(96))] [&_pre]:overflow-auto" v-html="rendered" />
        <p v-else class="sf-prose m-0 text-base leading-[1.6] whitespace-pre-wrap [overflow-wrap:anywhere]">{{ payload.content }}</p>
    </figure>
</template>
