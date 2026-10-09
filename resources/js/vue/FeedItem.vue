<script setup lang="ts">
import { computed, inject, toRef } from 'vue';
import { imageOf } from './body';
import { formsIn, resolve } from './body';
import { FEED_BODIES } from './keys';
import { bodyFrame } from '../shared/body';
import EntityAvatar from './EntityAvatar.vue';
import FeedHeadline from './FeedHeadline.vue';
import FeedIcon from './FeedIcon.vue';
import FeedMediaStrip from './FeedMediaStrip.vue';
import FeedMeta from './FeedMeta.vue';
import FeedMedia from './FeedMedia.vue';
import { entityLink } from '../shared/link';
import { rail as parseRail, railFor, withoutSecondary } from '../shared/rail';
import type { Rail, RailName } from '../shared/rail';
import type { ActivityNode, FeedNode } from '../shared/types';
import { useRelativeTime } from './useRelativeTime';

const props = withDefaults(
    defineProps<{
        objectIcon?: (node: FeedNode) => Record<string, any> | null;
        item: ActivityNode;
        /** Compact rendering for group children: tighter spacing, no badge. */
        dense?: boolean;
        /** Hide the rail below this row (last visible row). */
        isLast?: boolean;
        /**
         * Which fact the rail answers first — `actor`, `activity`,
         * `activity-only`, `actor-only`. See `rail.ts` for the model.
         */
        rail?: Rail | RailName | null;
    }>(),
    { dense: false, isLast: false, rail: null },
);

const icon = computed(() => props.objectIcon?.(props.item));

const bodies = inject(FEED_BODIES, {});

const time = useRelativeTime(toRef(() => props.item.published_at));

// Once redundant, a verb may have its own reading. This kit draws it in place
// of the headline; the ordinary one stays in the payload beside it.
const reading = computed(() =>
    props.item.redundant &&
    (props.item.missing_headline_template || props.item.missing_headline)
        ? {
              template: props.item.missing_headline_template ?? null,
              headline: props.item.missing_headline ?? null,
          }
        : {
              template: props.item.headline_template,
              headline: props.item.headline ?? null,
          },
);

/**
 * THE KIT'S DEFAULT IS WHAT IT ALREADY DREW. A row with no rail asked for shows
 * one face and no badge (`actor-only`); a group child shows the verb alone
 * (`activity-only`). Both are legal configurations, so naming them costs no
 * existing page a repaint. The Filament plugin's default is `actor` — a face
 * with the verb badged onto it — and a page that wants to show it says so.
 *
 * When a rail IS asked for, `dense` means exactly what it means in the plugin:
 * the same rail without its badge, not a fifth configuration.
 */
const resolved = computed<Rail>(() => {
    if (props.rail === null) {
        return parseRail(props.dense ? 'activity-only' : 'actor-only');
    }

    const asked = parseRail(props.rail);

    return props.dense ? withoutSecondary(asked) : asked;
});

/**
 * A collapsed group shows a SAMPLE of its members' photographs. A tile stands
 * for an entity, so it keeps that entity's link, and the overflow counts the
 * entities not shown rather than the members.
 */
const strip = computed(() => {
    const sample = (props.item as any).sample?.objects ?? [];
    const tiles = sample
        .map((entity: any) => ({
            image: imageOf(entity),
            href: entityLink(entity)?.href ?? null,
        }))
        .filter((tile: any) => tile.image !== null);

    return { tiles, overflow: 0 };
});

/**
 * The forms this node carries: the activity's own, then the object's.
 *
 * A detail lands at an APP-CHOSEN key inside the app's own map, so finding one
 * means walking `data` rather than reading a fixed key. An unrecognised form
 * yields nothing and the activity renders as it always would, minus the block.
 *
 * THE OBJECT IS THE ONLY ROLE READ, and that is a renderer's choice rather than
 * a rule of the payload — every entity may carry a detail, whatever role it
 * fills. Reading them all is what this did until the cost showed itself: an
 * actor's detail draws again under every row that person acts in, so one cook
 * and fifty rows is the same card fifty times. The object is what a row is
 * about, so its detail is the one that belongs beneath the sentence.
 */
const forms = computed(() => {
    const object = (props.item as any).object;

    const link = entityLink(object);
    const attributed = (found: any) => ({
        ...found,
        entityLabel: object?.label ?? null,
        entityUrl: link?.href ?? null,
        entityLink: link,
        entityMedia: object?.media ?? null,
    });

    return [
        // The activity's own map, still walked: an app may put a form at a key
        // of its own and this kit will find it.
        ...formsIn(props.item.data, 4, bodies),
        // The object's `body` — the slot — read directly, because that is the
        // whole point of it being a slot and not a key somebody chose.
        ...resolve(object?.body, bodies).map(attributed),
        ...formsIn(object?.data, 4, bodies).map(attributed),
    ];
});

/** The body's own `$maxHeight`, else the kit default `--sf-prose-max-h`. */
function frameAttributes(payload: Record<string, any>) {
    const frame = bodyFrame(payload);

    return {
        ...(frame.style ? { style: frame.style } : {}),
        ...(frame.capped ? { class: 'max-h-(--sf-prose-max-h) overflow-y-auto', tabindex: 0 } : {}),
    };
}

const slots = computed(() =>
    railFor(resolved.value, {
        actors: props.item.actor ? 1 : 0,
        glyph: Boolean(props.item.glyph),
    }),
);
</script>

<template>
    <div class="sf-row relative flex items-start gap-(--sf-gap)">
        <div class="sf-rail flex w-(--sf-gutter) shrink-0 flex-col items-center self-stretch">
            <!--
                THE DISC. One of three things: the face, the verb, or the blank
                mark that says the row belongs to the history it sits in when
                neither arrived. Activities are never hidden by the read path,
                so a rail may be empty and may never be broken.
            -->
            <div class="sf-rail__disc relative flex shrink-0">
                <EntityAvatar
                    v-if="slots.disc === 'actor'"
                    :entity="item.actor"
                />
                <FeedIcon
                    v-else-if="slots.disc === 'activity'"
                    :icon="item.glyph"
                    :intent="item.glyph_intent"
                />
                <span
                    v-else
                    class="sf-icon flex size-[var(--sf-disc,--spacing(8))] shrink-0 items-center justify-center rounded-full border border-border bg-background text-muted-foreground [&_svg]:size-3.5 sf-icon--blank border-dashed"
                    aria-hidden="true"
                />

                <!--
                    THE BADGE, on the disc's lower corner. It is why this rail
                    can answer "who" and "what" in the same 2rem instead of
                    choosing one.
                -->
                <FeedIcon
                    v-if="slots.badge === 'activity'"
                    :icon="item.glyph"
                    variant="badge"
                />
                <EntityAvatar
                    v-else-if="slots.badge === 'actor'"
                    :entity="item.actor"
                    size="badge"
                />
            </div>
            <div v-if="!isLast" aria-hidden="true" class="sf-rail__line mt-1 w-px flex-1 bg-border" />
        </div>

        <div
            class="sf-body min-w-0 flex-1"
            :class="[
                isLast ? '' : 'sf-body--spaced pb-5',
                dense ? 'sf-body--dense pt-1' : 'pt-1.5',
            ]"
        >
            <div class="sf-head flex items-baseline gap-3">
                <FeedHeadline
                    :template="reading.template"
                    :headline="reading.headline"
                    :entities="{
                        actor: item.actor,
                        object: item.object,
                        target: item.target,
                        context: item.context,
                        instrument: item.instrument,
                        origin: item.origin,
                        result: item.result,
                        location: item.location,
                        generator: item.generator,
                    }"
                    :verb="item.verb"
                />
            </div>
            <FeedMeta :node="item" :templates="[reading.template]">
                <template v-if="$slots.time">
                    <slot name="time" :node="item" :label="time.label.value" />
                </template>
                <time
                    v-else
                    :datetime="item.published_at"
                    :title="time.full.value"
                    class="sf-time text-sm text-muted-foreground"
                >
                    <!--
                        Slot so an app can make the timestamp a permalink to
                        the activity's Activity Streams 2.0 document, without
                        this component knowing your routes.
                    -->
                    {{ time.label.value }}
                </time>
            </FeedMeta>

            <!--
                Body slot: render a preview under the headline — a comment's
                text, a document thumbnail. Left empty by default because what
                belongs here is entirely app-specific.
            -->
            <div :class="icon ? 'sf-object-media mt-2 flex items-start gap-3' : 'contents'">
                <FeedMedia
                    v-if="icon"
                    :image="icon"
                    :href="entityLink(item.object)?.href ?? null"
                    :link-attributes="entityLink(item.object)?.attributes"
                    class="mt-0! size-10! shrink-0 rounded-md!"
                />
                <div :class="icon ? 'min-w-0 flex-1' : 'contents'">
                    <slot name="body" :node="item" />

                    <FeedMediaStrip
                        v-if="strip.tiles.length"
                        :tiles="strip.tiles"
                        :overflow="strip.overflow"
                    />

                    <!--
                        Recognised detail forms, drawn from the app's own `data`. One
                        block per detail, in the order the walk found them.
                    -->
                    <div
                        v-for="(found, index) in forms"
                        :key="index"
                        class="sf-body-form mt-2 max-w-176 empty:hidden"
                        v-bind="frameAttributes(found.payload)"
                    >
                        <component
                            :is="found.component"
                            :payload="found.payload"
                            :entity-label="(found as any).entityLabel"
                            :entity-url="(found as any).entityUrl"
                            :entity-media="(found as any).entityMedia"
                            :entity-link="(found as any).entityLink"
                        />
                    </div>

                </div>
            </div>
            <!--
                Annotations slot: for documentation and debugging surfaces that
                need to explain a node rather than render it — a slot mapping, a
                payload dump, a curation trace. Separate from `body` on purpose,
                so annotating a feed never costs you the app's own previews.
            -->
            <slot name="annotations" :node="item" />
        </div>
    </div>
</template>
