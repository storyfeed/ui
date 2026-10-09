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
        <pre v-if="payload.verbatim" class="sf-verbatim m-0 max-h-96 overflow-auto rounded-lg bg-foreground px-4 py-3 font-mono text-sm leading-[1.55] whitespace-pre-wrap text-background dark:bg-background dark:text-foreground [overflow-wrap:anywhere] [&_code]:bg-transparent [&_code]:p-0 [&_code]:font-[inherit] [&_code]:text-inherit" tabindex="0"><code>{{ payload.content }}</code></pre>
        <div v-else-if="rich" class="sf-rich-text max-h-96 overflow-auto text-base leading-[1.6] [overflow-wrap:anywhere] [&>:first-child]:mt-0 [&>:last-child]:mb-0 [&_p]:my-2 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5.5 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5.5 [&_blockquote]:my-2 [&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground [&_a]:text-primary [&_a]:underline [&_pre]:overflow-auto [&_pre]:rounded [&_pre]:bg-border [&_pre]:p-2 [&_table]:my-2 [&_:is(th,td)]:border [&_:is(th,td)]:border-border [&_:is(th,td)]:px-2 [&_:is(th,td)]:py-1 [&_th]:font-semibold [&_li:has(>input)]:list-none [&_li>input]:-ml-5 [&_li>input]:mr-1 [&_:is(h1,h2,h3,h4,h5,h6)]:mt-3 [&_:is(h1,h2,h3,h4,h5,h6)]:mb-1.5 [&_:is(h1,h2,h3,h4,h5,h6)]:border-0 [&_:is(h1,h2,h3,h4,h5,h6)]:p-0 [&_:is(h1,h2,h3,h4,h5,h6)]:text-base [&_:is(h1,h2,h3,h4,h5,h6)]:leading-[1.6] [&_:is(h1,h2,h3,h4,h5,h6)]:font-semibold" tabindex="0" v-html="rendered" />
        <p v-else class="sf-prose m-0 text-base leading-[1.6] whitespace-pre-wrap sf-prose--scroll max-h-96 overflow-auto [overflow-wrap:anywhere]" tabindex="0">{{ payload.content }}</p>
    </figure>
</template>
