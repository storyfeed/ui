<script setup lang="ts">
import { computed } from 'vue'

/** `Storyfeed/Body/KeyValue` — labelled rows under an optional title. A row
 * with no value is dropped unless the form supplied a word for its absence.
 * The title names what the rows describe, so the card reads on its own even
 * where the headline already says it. */
const props = defineProps<{ payload: Record<string, any> }>()

const rows = computed(() =>
    (props.payload.items ?? []).map((row: any) => ({
        ...row,
        placeholder: 'placeholder' in row ? row.placeholder
            : (props.payload.$v ?? 1) < 2 && 'missing' in row ? row.missing
                : 'defaultPlaceholder' in props.payload ? props.payload.defaultPlaceholder
                    : (props.payload.$v ?? 1) < 2 ? props.payload.missing : null,
    })).filter(
        (row: any) => !(row.value === null || row.value === '') || row.placeholder != null,
    ),
)

const disclosure = computed(() => typeof props.payload.disclosure === 'string' && props.payload.disclosure.trim() !== '' ? props.payload.disclosure : null)

const text = (value: unknown) => (typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value))
</script>

<template>
    <component :is="disclosure ? 'details' : 'figure'" v-if="rows.length" class="sf-facts @container/facts m-0 flex max-w-128 flex-col rounded-lg border border-[var(--sf-well-border,color-mix(in_oklab,var(--color-foreground)_8%,transparent))] bg-[var(--sf-well,color-mix(in_oklab,var(--color-card)_55%,transparent))] dark:bg-[var(--sf-well,color-mix(in_oklab,var(--color-foreground)_3%,transparent))] px-3 py-1.5 text-sm leading-[1.5]">
        <summary v-if="disclosure" class="cursor-pointer rounded-sm py-1 font-medium text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">{{ disclosure }}</summary>
        <component :is="disclosure ? 'p' : 'figcaption'" v-if="payload.title" class="sf-facts__title border-b border-border pt-0.75 pb-1.25 font-semibold text-foreground">{{ payload.title }}</component>
        <dl class="sf-facts__rows m-0 grid grid-cols-[fit-content(40%)_minmax(0,1fr)] @max-[28rem]/facts:grid-cols-1">
            <div v-for="row in rows" :key="row.key" class="sf-facts__row col-span-full grid grid-cols-subgrid items-baseline gap-x-4 gap-y-1 border-b border-border py-0.75 last:border-b-0">
                <dt class="sf-facts__label [overflow-wrap:anywhere] text-muted-foreground">{{ row.key }}</dt>
                <dd
                    class="sf-facts__value m-0 min-w-0 text-left text-foreground tabular-nums [overflow-wrap:anywhere]"
                    :class="{ 'sf-facts__value--verbatim font-mono text-sm': row.verbatim, 'truncate': row.verbatim && !disclosure }"
                    :title="row.verbatim && typeof row.value === 'string' ? row.value : undefined"
                >
                    <span v-if="row.value === null || row.value === ''" class="sf-facts__value--absent block max-w-full text-muted-foreground italic">{{ row.placeholder }}</span>
                    <template v-else-if="row.verbatim">{{ text(row.value) }}</template>
                    <span v-else class="block max-w-full">{{ text(row.value) }}</span>
                </dd>
            </div>
        </dl>
    </component>
</template>
