<script setup lang="ts">
import { toRef } from 'vue';
import FeedNodeView from './FeedNode.vue';
import type { Rail, RailName } from '../shared/rail';
import type { FeedNode } from '../shared/types';
import { useFeedDays } from './useRelativeTime';

const props = withDefaults(
    defineProps<{
        items: FeedNode[];
        /** Null means the end of the feed — never an empty page. */
        nextCursor?: string | null;
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
        /** How a divider meets the rail: a `dot` on it, or a `branch` off it. */
        dividerStyle?: 'dot' | 'branch';
    }>(),
    {
        nextCursor: null,
        loadingMore: false,
        grouped: true,
        interactive: true,
        collapsed: null,
        rail: null,
        dividers: () => ({}),
        dividerStyle: 'dot',
    },
);

const emit = defineEmits<{ loadMore: [] }>();

const days = useFeedDays(toRef(() => props.items));
</script>

<template>
    <div class="sf-feed [--spacing:calc(var(--sf-font-size,1rem)/4)] [--text-xs:calc(var(--sf-font-size,1rem)*0.75)] [--text-sm:calc(var(--sf-font-size,1rem)*0.875)] [--text-base:var(--sf-font-size,1rem)] [--sf-gutter:--spacing(8)] [--sf-gap:--spacing(3)] [--sf-disc:--spacing(8)] [--sf-badge:--spacing(3.5)] [--sf-badge-face:--spacing(4.5)] text-base leading-[1.6] text-muted-foreground">
        <div v-if="items.length === 0" class="sf-empty rounded-lg border border-dashed border-border p-10 text-center text-muted-foreground">
            <slot name="empty">No activity yet.</slot>
        </div>

        <div v-else role="list">
            <section v-for="(day, dayIndex) in days" :key="day.label">
                <div
                    v-if="grouped"
                    :class="[
                        'sf-row sf-divider relative flex items-start gap-(--sf-gap) [&_.sf-rail>div:last-child]:mt-1.25',
                        dividerStyle === 'branch' ? 'sf-divider--branch [&_.sf-rail]:relative [&_.sf-rail>div:last-child]:mt-5.5' : 'sf-divider--dot',
                    ]"
                >
                    <div class="sf-rail flex w-(--sf-gutter) shrink-0 flex-col items-center self-stretch">
                        <svg
                            v-if="dividerStyle === 'branch'"
                            aria-hidden="true"
                            class="sf-rail__branch absolute top-0.75 left-[calc(50%-var(--spacing)*0.1875)] h-5.5 w-4 overflow-visible fill-none stroke-muted-foreground stroke-[1.5] [stroke-linecap:round]"
                            width="16"
                            height="22"
                            viewBox="0 0 16 22"
                        >
                            <path d="M0.75 22 V14 Q0.75 6 8.75 6 H15" />
                        </svg>
                        <div v-else aria-hidden="true" class="sf-rail__node mt-1.25 size-2.25 shrink-0 rounded-full bg-muted-foreground ring-3 ring-background" />
                        <div aria-hidden="true" class="sf-rail__line mt-1 w-px flex-1 bg-border" />
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
                            'sf-row sf-divider relative flex items-start gap-(--sf-gap) [&_.sf-rail>div:last-child]:mt-1.25',
                            dividerStyle === 'branch' ? 'sf-divider--branch [&_.sf-rail]:relative [&_.sf-rail>div:last-child]:mt-5.5' : 'sf-divider--dot',
                        ]"
                    >
                        <div class="sf-rail flex w-(--sf-gutter) shrink-0 flex-col items-center self-stretch">
                            <svg
                                v-if="dividerStyle === 'branch'"
                                aria-hidden="true"
                                class="sf-rail__branch absolute top-0.75 left-[calc(50%-var(--spacing)*0.1875)] h-5.5 w-4 overflow-visible fill-none stroke-muted-foreground stroke-[1.5] [stroke-linecap:round]"
                                width="16"
                                height="22"
                                viewBox="0 0 16 22"
                            >
                                <path d="M0.75 22 V14 Q0.75 6 8.75 6 H15" />
                            </svg>
                            <div
                                v-else
                                aria-hidden="true"
                                class="sf-rail__node mt-1.25 size-2.25 shrink-0 rounded-full bg-muted-foreground ring-3 ring-background"
                            />
                            <div aria-hidden="true" class="sf-rail__line mt-1 w-px flex-1 bg-border" />
                        </div>
                        <h2 class="sf-day m-0 border-0 pt-0 pb-5 text-xs leading-[1.6] font-semibold tracking-[0.05em] text-muted-foreground uppercase">{{ dividers[item.id] }}</h2>
                    </div>
                    <FeedNodeView
                        :item="item"
                        :is-last="
                            dayIndex === days.length - 1 &&
                            index === day.items.length - 1 &&
                            !nextCursor
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

            <div v-if="nextCursor" class="sf-row relative flex items-start gap-(--sf-gap)">
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
