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

const text = (value: unknown) => (typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value))
</script>

<template>
    <figure v-if="rows.length" class="sf-facts m-0 flex max-w-lg flex-col rounded-lg border border-border px-3 py-1.5 text-[13.5px] leading-[1.5]">
        <figcaption v-if="payload.title" class="sf-facts__title border-b border-border pt-[3px] pb-[5px] font-semibold text-foreground">{{ payload.title }}</figcaption>
        <dl class="sf-facts__rows m-0 flex flex-col">
            <div v-for="row in rows" :key="row.key" class="sf-facts__row grid grid-cols-[max-content_minmax(0,1fr)] items-baseline gap-x-4 gap-y-1 border-b border-border py-[3px] last:border-b-0">
                <dt class="sf-facts__label whitespace-nowrap text-foreground">{{ row.key }}</dt>
                <dd
                    class="sf-facts__value m-0 min-w-0 text-right text-muted-foreground tabular-nums [overflow-wrap:anywhere]"
                    :class="{ 'sf-facts__value--verbatim truncate font-mono text-[12.5px]': row.verbatim }"
                    :title="row.verbatim && typeof row.value === 'string' ? row.value : undefined"
                >
                    <span v-if="row.value === null || row.value === ''" class="sf-facts__value--absent ml-auto block w-fit max-w-full text-left text-muted-foreground italic">{{ row.placeholder }}</span>
                    <template v-else-if="row.verbatim">{{ text(row.value) }}</template>
                    <span v-else class="ml-auto block w-fit max-w-full text-left">{{ text(row.value) }}</span>
                </dd>
            </div>
        </dl>
    </figure>
</template>
