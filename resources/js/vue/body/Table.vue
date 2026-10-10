<script setup lang="ts">
import { computed, inject } from 'vue'
import { FEED_LINK } from '../keys'
import { readTable } from '../../shared/table'
import { bodyLink, linkProps, ownLink, type ResolvedLink } from '../../shared/link'

/**
 * `Storyfeed/Body/Table` — a standard table inside Typography's `prose`,
 * footer rows in a `<tfoot>`. Cells are plain text that keeps its line
 * breaks, a number, a link, or nothing (drawn as a dash).
 */
const props = defineProps<{ payload: Record<string, any>; entityUrl?: string | null; entityLink?: ResolvedLink | null }>()

const linkComponent = inject(FEED_LINK, 'a')
const table = computed(() => readTable(props.payload))
const sections = computed(() => table.value ? ([['tbody', table.value.rows], ['tfoot', table.value.footer]] as const).filter(([, rows]) => rows.length) : [])
// A link cell goes to its href, or to the entity's own.
const link = (cell: any) => bodyLink(cell, ownLink(props.entityLink, props.entityUrl))
</script>

<template>
    <figure v-if="table" class="sf-table-block m-0 min-w-0 max-w-144 rounded-lg bg-card px-4 py-3">
        <figcaption v-if="table.title" class="sf-table__title mb-1 text-sm font-semibold text-foreground">{{ table.title }}</figcaption>
        <div class="sf-table__prose overflow-x-auto prose [&_th]:font-medium [&_th]:text-muted-foreground [&_td]:text-foreground max-w-none text-[length:var(--text-sm)] [overflow-wrap:anywhere] [--tw-prose-body:var(--color-muted-foreground)] [--tw-prose-headings:var(--color-foreground)] [--tw-prose-lead:var(--color-muted-foreground)] [--tw-prose-links:var(--color-primary)] [--tw-prose-bold:var(--color-foreground)] [--tw-prose-counters:var(--color-muted-foreground)] [--tw-prose-bullets:var(--color-muted-foreground)] [--tw-prose-hr:var(--color-border)] [--tw-prose-quotes:var(--color-foreground)] [--tw-prose-quote-borders:var(--color-border)] [--tw-prose-captions:var(--color-muted-foreground)] [--tw-prose-kbd:var(--color-foreground)] [--tw-prose-code:var(--color-foreground)] [--tw-prose-pre-code:var(--color-foreground)] [--tw-prose-pre-bg:var(--color-muted)] [--tw-prose-th-borders:var(--color-border)] [--tw-prose-td-borders:var(--color-border)] [&_table]:text-[length:1em] prose-headings:mt-[1.25em] prose-headings:mb-[0.5em] prose-headings:text-[length:1em] prose-headings:leading-[1.5] prose-h1:font-semibold prose-h2:font-semibold prose-h3:font-medium prose-h4:font-medium [&_h5]:font-medium [&_h6]:font-medium [&_:not(pre)>code]:rounded [&_:not(pre)>code]:bg-muted [&_:not(pre)>code]:px-[0.3em] [&_:not(pre)>code]:py-[0.1em] [&_:not(pre)>code]:font-normal [&_:not(pre)>code]:before:content-none [&_:not(pre)>code]:after:content-none [&_table]:my-0 [&_table]:w-full [&_:is(th,td)]:whitespace-pre-line [&_tfoot_td]:font-semibold [&_tfoot_td]:text-foreground" tabindex="0">
            <table class="sf-table">
                <thead v-if="table.headers.length"><tr><th v-for="(header, i) in table.headers" :key="i">{{ header }}</th></tr></thead>
                <component :is="section" v-for="[section, rows] in sections" :key="section">
                    <tr v-for="(row, r) in rows" :key="r">
                        <td v-for="(cell, c) in row" :key="c"><component
                            :is="linkComponent"
                            v-if="cell !== null && typeof cell === 'object' && link(cell)"
                            v-bind="linkProps(link(cell)!, linkComponent)"
                            class="sf-entity font-medium text-foreground no-underline underline-offset-2 hover:underline"
                        >{{ cell.label }}</component><template v-else-if="cell !== null && typeof cell === 'object'">{{ cell.label }}</template><span v-else-if="cell === null" class="sf-table__empty text-muted-foreground">—</span><template v-else>{{ cell }}</template></td>
                    </tr>
                </component>
            </table>
        </div>
    </figure>
</template>
