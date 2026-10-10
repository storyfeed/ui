<script setup lang="ts">
import { computed, toRef } from 'vue';
import FeedNodeView from './FeedNode.vue';
import type { Rail, RailName } from '../shared/rail';
import type { FeedNode } from '../shared/types';
import { readPage, type FeedPageLike } from '../shared/page';
import { useFeedDays } from './useRelativeTime';

const props = withDefaults(
    defineProps<{
        items?: FeedNode[];
        /** Null means the end of the feed — never an empty page. */
        nextCursor?: string | null;
        /** A whole page in place of `items` and `nextCursor`: core's JSON, with the nodes under `data` (#95) or `items`. */
        page?: FeedPageLike;
        loadingMore?: boolean;
        /** Set false for a static excerpt with no day headings. */
        grouped?: boolean;
        /**
         * Which fact the rail answers first — `actor`, `activity`,
         * `activity-only`, `actor-only`. Null keeps this kit's default; see
         * `rail.ts` and `/basics/the-rail`.
         */
        rail?: Rail | RailName | null;
        /** Override the rail for expanded members independently of their group. */
        childRail?: Rail | RailName | null;
        interactive?: boolean;
        collapsed?: boolean | null;
        /**
         * Labels to draw on the rail before particular items, keyed by item
         * id: `{ [firstTimelineId]: 'Timeline' }`. Drawn like a day heading,
         * as a node on the rail rather than a heading above it.
         */
        dividers?: Record<string, string>;
        /** How a divider meets the rail: a `branch` off it (the default), or a `dot` on it. */
        dividerStyle?: 'dot' | 'branch';
    }>(),
    {
        items: undefined,
        nextCursor: undefined,
        page: undefined,
        loadingMore: false,
        grouped: true,
        interactive: true,
        collapsed: null,
        rail: null,
        dividers: () => ({}),
        dividerStyle: 'branch',
    },
);

const emit = defineEmits<{ loadMore: [] }>();

const read = computed(() => readPage(props.page));
const nodes = computed(() => props.items ?? read.value.items);
const cursor = computed(() => props.nextCursor ?? read.value.nextCursor);

const days = useFeedDays(toRef(() => nodes.value));
</script>

<template>
    <div class="sf-feed [--spacing:calc(var(--sf-font-size,1rem)/4)] [--text-xs:calc(var(--sf-font-size,1rem)*0.75)] [--text-sm:calc(var(--sf-font-size,1rem)*0.875)] [--text-base:var(--sf-font-size,1rem)] [--sf-gutter:--spacing(8)] [--sf-gap:--spacing(3)] [--sf-disc:--spacing(8)] [--sf-badge:--spacing(3.5)] [--sf-badge-face:--spacing(4.5)] text-base leading-[1.6] text-muted-foreground">
        <div v-if="nodes.length === 0" class="sf-empty rounded-lg border border-dashed border-border p-10 text-center text-muted-foreground">
            <slot name="empty">No activity yet.</slot>
        </div>

        <div v-else role="list">
            <section v-for="(day, dayIndex) in days" :key="day.label">
                <div
                    v-if="grouped"
                    :class="[
                        'sf-row sf-divider relative flex items-start gap-(--sf-gap)',
                        dividerStyle === 'dot' ? 'sf-divider--dot [&_.sf-rail>div:last-child]:mt-1.25' : 'sf-divider--branch',
                    ]"
                >
                    <div class="sf-rail relative flex w-(--sf-gutter) shrink-0 flex-col items-center self-stretch">
                        <div v-if="dividerStyle === 'dot'" aria-hidden="true" class="sf-rail__node mt-1.25 size-2.25 shrink-0 rounded-full bg-muted-foreground ring-3 ring-background" />
                        <div v-else aria-hidden="true" class="sf-rail__branch absolute top-[calc(0.5625em-0.5px)] left-[calc(50%-0.5px)] h-2 w-[calc(50%+0.5px+var(--sf-gap)-var(--spacing)*1.5)] rounded-tl-[calc(var(--spacing)*2)] border-t border-l border-border" />
                        <div
                            aria-hidden="true"
                            :class="['sf-rail__line w-px flex-1 bg-border', dividerStyle === 'dot' ? 'mt-1' : { 'mt-[calc(0.5625em-0.5px+var(--spacing)*2)]': dayIndex === 0 }]"
                        />
                    </div>
                    <h2 class="sf-day m-0 border-0 pt-0 pb-5 text-xs leading-[1.6] font-semibold tracking-[0.05em] text-muted-foreground uppercase">{{ day.label }}</h2>
                </div>

                <div
                    v-for="(item, index) in day.items"
                    :key="item.id"
                    role="listitem"
                >
                    <div
                        v-if="dividers[item.id]"
                        :class="[
                            'sf-row sf-divider relative flex items-start gap-(--sf-gap)',
                            dividerStyle === 'dot' ? 'sf-divider--dot [&_.sf-rail>div:last-child]:mt-1.25' : 'sf-divider--branch',
                        ]"
                    >
                        <div class="sf-rail relative flex w-(--sf-gutter) shrink-0 flex-col items-center self-stretch">
                            <div v-if="dividerStyle === 'dot'" aria-hidden="true" class="sf-rail__node mt-1.25 size-2.25 shrink-0 rounded-full bg-muted-foreground ring-3 ring-background" />
                            <div v-else aria-hidden="true" class="sf-rail__branch absolute top-[calc(0.5625em-0.5px)] left-[calc(50%-0.5px)] h-2 w-[calc(50%+0.5px+var(--sf-gap)-var(--spacing)*1.5)] rounded-tl-[calc(var(--spacing)*2)] border-t border-l border-border" />
                            <div
                                aria-hidden="true"
                                :class="['sf-rail__line w-px flex-1 bg-border', dividerStyle === 'dot' ? 'mt-1' : { 'mt-[calc(0.5625em-0.5px+var(--spacing)*2)]': !grouped && dayIndex === 0 && index === 0 }]"
                            />
                        </div>
                        <h2 class="sf-day m-0 border-0 pt-0 pb-5 text-xs leading-[1.6] font-semibold tracking-[0.05em] text-muted-foreground uppercase">{{ dividers[item.id] }}</h2>
                    </div>
                    <FeedNodeView
                        :item="item"
                        :is-last="
                            dayIndex === days.length - 1 &&
                            index === day.items.length - 1 &&
                            !cursor
                        "
                        :rail="rail"
                        :child-rail="childRail"
                        :interactive="interactive"
                        :collapsed="collapsed"
                    >
                        <template #body="slotProps"
                            ><slot name="body" v-bind="slotProps"
                        /></template>
                        <template #annotations="slotProps"
                            ><slot name="annotations" v-bind="slotProps"
                        /></template>
                        <template v-if="$slots.time" #time="slotProps"
                            ><slot name="time" v-bind="slotProps"
                        /></template>
                    </FeedNodeView>
                </div>
            </section>

            <div v-if="cursor" class="sf-row relative flex items-start gap-(--sf-gap)">
                <div class="sf-rail flex w-(--sf-gutter) shrink-0 flex-col items-center self-stretch">
                    <div aria-hidden="true" class="sf-rail__line mt-1 w-px flex-1 bg-border" />
                </div>
                <button
                    type="button"
                    class="sf-more cursor-pointer rounded-md border border-border bg-transparent px-3 py-1.5 text-sm font-medium text-muted-foreground enabled:hover:bg-muted enabled:hover:text-foreground disabled:cursor-default disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-ring"
                    :disabled="loadingMore"
                    @click="emit('loadMore')"
                >
                    {{ loadingMore ? 'Loading…' : 'Load older activity' }}
                </button>
            </div>
        </div>
    </div>
</template>
