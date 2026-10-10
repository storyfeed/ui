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
        <figcaption v-if="payload.title" class="sf-prose__title mb-2 text-sm font-semibold text-foreground">{{ payload.title }}</figcaption>
        <!-- Verbatim output is a dark block with light text in every theme (ui#23): the kit's own --sf-code-bg / --sf-code-fg, lifted a little from a dark page. -->
        <pre v-if="payload.verbatim" class="sf-verbatim m-0 max-h-[var(--sf-prose-max-h,--spacing(96))] overflow-auto rounded-lg bg-[var(--sf-code-bg,#18181b)] px-4 py-3 font-mono text-sm leading-[1.55] whitespace-pre-wrap text-[var(--sf-code-fg,#f4f4f5)] dark:bg-[var(--sf-code-bg,#27272a)] [overflow-wrap:anywhere] [&_code]:bg-transparent [&_code]:p-0 [&_code]:font-[inherit] [&_code]:text-inherit" tabindex="0"><code>{{ payload.content }}</code></pre>
        <div v-else-if="rich" class="sf-rich-text prose max-w-none text-[length:var(--text-sm)] [overflow-wrap:anywhere] [--tw-prose-body:var(--color-muted-foreground)] [--tw-prose-headings:var(--color-foreground)] [--tw-prose-lead:var(--color-muted-foreground)] [--tw-prose-links:var(--color-primary)] [--tw-prose-bold:var(--color-foreground)] [--tw-prose-counters:var(--color-muted-foreground)] [--tw-prose-bullets:var(--color-muted-foreground)] [--tw-prose-hr:var(--color-border)] [--tw-prose-quotes:var(--color-foreground)] [--tw-prose-quote-borders:var(--color-border)] [--tw-prose-captions:var(--color-muted-foreground)] [--tw-prose-kbd:var(--color-foreground)] [--tw-prose-code:var(--color-foreground)] [--tw-prose-pre-code:var(--color-foreground)] [--tw-prose-pre-bg:var(--color-muted)] [--tw-prose-th-borders:var(--color-border)] [--tw-prose-td-borders:var(--color-border)] [&_table]:text-[length:1em] prose-headings:mt-[1.25em] prose-headings:mb-[0.5em] prose-headings:text-[length:1em] prose-headings:leading-[1.5] prose-h1:font-semibold prose-h2:font-semibold prose-h3:font-medium prose-h4:font-medium [&_h5]:font-medium [&_h6]:font-medium [&_:not(pre)>code]:rounded [&_:not(pre)>code]:bg-muted [&_:not(pre)>code]:px-[0.3em] [&_:not(pre)>code]:py-[0.1em] [&_:not(pre)>code]:font-normal [&_:not(pre)>code]:before:content-none [&_:not(pre)>code]:after:content-none [&_li:has(>input)]:list-none [&_li>input]:my-0 [&_li>input]:-ms-[1.5em] [&_li>input]:me-[0.5em] [&_[align=center]]:text-center [&_[align=right]]:text-right [&_pre]:max-h-[var(--sf-prose-max-h,--spacing(96))] [&_pre]:overflow-auto" v-html="rendered" />
        <p v-else class="sf-prose m-0 text-sm leading-[1.6] whitespace-pre-wrap [overflow-wrap:anywhere]">{{ payload.content }}</p>
    </figure>
</template>
