<script setup lang="ts">
import { computed, ref, toRef } from 'vue';
import { imageOf } from './body';
import EntityAvatar from './EntityAvatar.vue';
import FeedHeadline from './FeedHeadline.vue';
import FeedIcon from './FeedIcon.vue';
import FeedItem from './FeedItem.vue';
import FeedMediaStrip from './FeedMediaStrip.vue';
import FeedMeta from './FeedMeta.vue';
import { rail as parseRail, railFor } from '../shared/rail';
import type { Rail, RailName } from '../shared/rail';
import type { FeedPhrase, GroupNode, FeedSingularRole } from '../shared/types';
import { useRelativeTime } from './useRelativeTime';

const props = withDefaults(
    defineProps<{
        item: GroupNode;
        isLast?: boolean;
        /** Which fact the rail answers first. Null keeps this kit's default. */
        rail?: Rail | RailName | null;
        /** Override the rail for expanded members independently of their group. */
        childRail?: Rail | RailName | null;
    }>(),
    { isLast: false, rail: null },
);

/** See `FeedItem` for why an unasked-for rail is `actor-only` here. */
const resolved = computed<Rail>(() =>
    parseRail(props.rail === null ? 'actor-only' : props.rail),
);

// A group's faces come from its sample, capped at three — and more than one of
// them suppresses the badge, because a single face over a group of several
// actors is the one-actor lie the sample list exists to refuse.
const faces = computed(() => (props.item.sample.actors ?? []).slice(0, 3));

const slots = computed(() =>
    railFor(resolved.value, {
        actors: faces.value.length,
        glyph: Boolean(props.item.glyph),
    }),
);

// A group the package declined to name (no template, no headline) has nothing
// to summarize, so it opens on its members instead of hiding them behind a
// count. Reachable by design — the payload contract requires renderers to
// handle it, and it is not an error state.
const unnamed = computed(
    () =>
        !props.item.headline_template &&
        !props.item.headline &&
        !props.item.phrases?.length,
);

const expanded = ref(unnamed.value);

const time = useRelativeTime(toRef(() => props.item.published_at));

// Only core's explicit slots pin a group role; distinct=1 is not a pin.
const singular = (role: FeedSingularRole) => props.item[role] ?? null;

/**
 * A summary row with no headline of its own reads as its actor and its
 * phrases, joined: "checked in at the Fun Fair, got a balloon and went on 3
 * rides". Three phrases at most; the rest are counted, never dropped, and the
 * members are all behind "Show all".
 */
const PHRASES_SHOWN = 3;

const phrases = computed(() =>
    props.item.headline_template || props.item.headline
        ? []
        : (props.item.phrases ?? []).slice(0, PHRASES_SHOWN),
);

const phrasesBeyond = computed(() =>
    Math.max(0, props.item.count - phrases.value.reduce((sum, phrase) => sum + phrase.count, 0)),
);

/** A phrase's own singulars, where its sample genuinely has one. */
const phraseEntities = (phrase: FeedPhrase) =>
    Object.fromEntries(
        (
            [
                'object',
                'target',
                'context',
                'instrument',
                'origin',
                'result',
                'location',
                'generator',
            ] as const
        ).map((role) => {
            const shown = phrase.sample[`${role}s`] ?? [];

            return [
                role,
                shown.length === 1 && phrase.distinct[`${role}s`] === 1
                    ? shown[0]
                    : null,
            ];
        }),
    );

const phraseSeparator = (index: number) =>
    index === phrases.value.length - 1
        ? ''
        : index === phrases.value.length - 2 && phrasesBeyond.value === 0
          ? ' and '
          : ', ';

const entities = computed(() => ({
    actor: singular('actor'),
    object: singular('object'),
    target: singular('target'),
    context: singular('context'),
    instrument: singular('instrument'),
    origin: singular('origin'),
    result: singular('result'),
    location: singular('location'),
    generator: singular('generator'),
}));

/**
 * A collapsed group samples at most three Image bodies, objects first and
 * then the other roles. The same image source appears only once, with its
 * first entity's link. Distinct role totals cannot count unseen photographs,
 * so the default strip makes no media overflow claim.
 *
 * The strip hides when the members themselves are visible — a sample of a list
 * you are already looking at is noise.
 */
const strip = computed(() => {
    if (props.item.axis === 'summary' || props.item.phrases?.length || expanded.value) {
        return { tiles: [], overflow: 0 };
    }

    const seen = new Set<string>();
    const tiles = ['objects', 'actors', 'targets', 'contexts', 'origins', 'results', 'instruments', 'locations', 'generators']
        .flatMap(role => props.item.sample[role as keyof typeof props.item.sample] ?? [])
        .flatMap(entity => {
            const image = imageOf(entity);
            if (!image || seen.has(image.src)) return [];
            seen.add(image.src);
            return [{ image, href: entity.url ?? null }];
        })
        .slice(0, 3);

    return { tiles, overflow: 0 };
});

// `count` is the TRUE total and `children` is capped by the server, so the
// remainder has to be stated rather than implied by the list length.
const hiddenBeyondChildren = computed(
    () => props.item.count - props.item.children.length,
);
</script>

<template>
    <div class="sf-row relative flex items-start gap-(--sf-gap)">
        <div class="sf-rail flex w-(--sf-gutter) shrink-0 flex-col items-center self-stretch">
            <div class="sf-rail__disc relative flex shrink-0">
                <div v-if="slots.disc === 'actor'" class="sf-avatars flex [&>*+*]:-ml-3">
                    <EntityAvatar
                        v-for="actor in faces"
                        :key="actor.id"
                        :entity="actor"
                        :size="faces.length > 1 ? 'sm' : 'md'"
                    />
                </div>
                <!--
                    One dividend of the flip: an activity-centric group is a
                    single glyph, so the stacking case simply does not arise.
                -->
                <FeedIcon
                    v-else-if="slots.disc === 'activity'"
                    :icon="item.glyph"
                    :intent="item.glyph_intent"
                />
                <span
                    v-else
                    class="sf-icon flex size-[var(--sf-disc,2rem)] shrink-0 items-center justify-center rounded-full border border-border bg-background text-muted-foreground [&_svg]:size-3.5 sf-icon--blank border-dashed"
                    aria-hidden="true"
                />

                <FeedIcon
                    v-if="slots.badge === 'activity'"
                    :icon="item.glyph"
                    variant="badge"
                />
                <EntityAvatar
                    v-else-if="slots.badge === 'actor'"
                    :entity="faces[0] ?? null"
                    size="badge"
                />
            </div>
            <div
                v-if="!isLast || expanded"
                aria-hidden="true"
                class="sf-rail__line mt-1 w-px flex-1 bg-border"
            />
        </div>

        <div
            class="sf-body min-w-0 flex-1 pt-1.5"
            :class="isLast && !expanded ? '' : 'sf-body--spaced pb-5'"
        >
            <div class="sf-head flex items-baseline gap-3">
                <span v-if="phrases.length > 0" class="sf-headline leading-[1.6] text-muted-foreground">
                    <FeedHeadline
                        :template="entities.actor ? ':actor' : ':actors'"
                        :entities="entities"
                        :sample="item.sample"
                        :distinct="item.distinct"
                        :verb="null"
                        aggregate
                    />{{ ' '
                    }}<template
                        v-for="(phrase, index) in phrases"
                        :key="phrase.verb"
                        ><FeedHeadline
                            v-if="phrase.headline_template || phrase.headline"
                            :template="phrase.headline_template"
                            :headline="phrase.headline"
                            :entities="phraseEntities(phrase)"
                            :sample="phrase.sample"
                            :distinct="phrase.distinct"
                            :count="phrase.count"
                            :verb="phrase.verb"
                            aggregate
                        /><span v-else class="sf-label"
                            >{{ phrase.verb }} ×{{ phrase.count }}</span
                        >{{ phraseSeparator(index) }}</template
                    ><template v-if="phrasesBeyond > 0">
                        and {{ phrasesBeyond }} more</template
                    >
                </span>
                <FeedHeadline
                    v-else
                    :template="item.headline_template"
                    :headline="item.headline"
                    :entities="entities"
                    :sample="item.sample"
                    :distinct="item.distinct"
                    :count="item.count"
                    :verb="item.verb"
                    aggregate
                />
            </div>
            <FeedMeta
                :node="item"
                :templates="
                    phrases.length
                        ? phrases.map((phrase) => phrase.headline_template)
                        : [item.headline_template]
                "
            >
                <template v-if="$slots.time">
                    <slot name="time" :node="item" :label="time.label.value" />
                </template>
                <time
                    v-else
                    :datetime="item.published_at"
                    :title="time.full.value"
                    class="sf-time text-xs text-muted-foreground"
                >
                    {{ time.label.value }}
                </time>
            </FeedMeta>

            <!--
                A group is a node too, so it gets the same annotations slot an
                activity does — otherwise a documentation surface can annotate
                every kind of node except the interesting one.
            -->
            <FeedMediaStrip
                v-if="!expanded && strip.tiles.length"
                :tiles="strip.tiles"
                :overflow="strip.overflow"
            />

            <slot name="body" :node="item" />

            <slot name="annotations" :node="item" />

            <button
                v-if="item.children.length > 0"
                type="button"
                class="sf-toggle mt-1 cursor-pointer border-0 bg-transparent p-0 text-xs leading-[1.6] font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-ring"
                :aria-expanded="expanded"
                @click="expanded = !expanded"
            >
                {{ expanded ? 'Show less' : `Show all ${item.count}` }}
            </button>

            <div v-if="expanded" class="sf-children mt-3">
                <FeedItem
                    v-for="(child, index) in item.children"
                    :key="child.id"
                    :item="child"
                    dense
                    :rail="childRail ?? rail"
                    :is-last="
                        index === item.children.length - 1 &&
                        hiddenBeyondChildren === 0
                    "
                >
                    <template #time="slotProps">
                        <slot name="time" v-bind="slotProps">{{
                            slotProps.label
                        }}</slot>
                    </template>
                    <template #body="slotProps">
                        <slot name="body" v-bind="slotProps" />
                    </template>
                    <template #annotations="slotProps">
                        <slot name="annotations" v-bind="slotProps" />
                    </template>
                </FeedItem>
                <p v-if="hiddenBeyondChildren > 0" class="sf-overflow pl-[calc(var(--sf-gutter)+var(--sf-gap))] text-xs leading-[1.6] text-muted-foreground">
                    …and {{ hiddenBeyondChildren }} more not shown
                </p>
            </div>
        </div>
    </div>
</template>
