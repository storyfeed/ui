<script setup lang="ts">
import { computed, inject } from 'vue'
import { FEED_LINK } from '../keys'
import { readCallToAction } from '../../shared/callToAction'

/**
 * `Storyfeed/Body/CallToAction` — an optional heading and a sentence or two,
 * then one action, drawn as a button. A lone action draws as the button
 * alone. A `modal` link asks the host's link component (Inertia's `Link`) to
 * open it in a modal; a plain anchor ignores it.
 */
const props = defineProps<{ payload: Record<string, any>; entityUrl?: string | null }>()

const linkComponent = inject(FEED_LINK, 'a')
const cta = computed(() => readCallToAction(props.payload, props.entityUrl))
const actionProps = computed(() => cta.value?.action
    ? { ...cta.value.action.attributes, href: cta.value.action.href, ...(linkComponent !== 'a' && cta.value.action.modal ? { modal: true } : {}) }
    : {})
</script>

<template>
    <div v-if="cta && (cta.subject || cta.content)" class="sf-cta mt-1.5 flex min-w-0 max-w-128 flex-col items-start gap-1 rounded-lg border border-border bg-card p-3 [overflow-wrap:anywhere]">
        <p v-if="cta.subject" class="sf-cta__subject m-0 text-base font-medium text-foreground">{{ cta.subject }}</p>
        <p v-if="cta.content" class="sf-cta__content m-0 text-base leading-[1.6] whitespace-pre-line text-muted-foreground">{{ cta.content }}</p>
        <component :is="linkComponent" v-if="cta.action" v-bind="actionProps" class="sf-cta__action inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground no-underline hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring mt-1.5">{{ cta.action.label }}<span aria-hidden="true">→</span></component>
    </div>
    <component :is="linkComponent" v-else-if="cta?.action" v-bind="actionProps" class="sf-cta__action inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground no-underline hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">{{ cta.action.label }}<span aria-hidden="true">→</span></component>
</template>
