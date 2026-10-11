<script setup lang="ts">
import { computed, inject } from 'vue';
import EntityLink from './EntityLink.vue';
import type { FeedEntities, FeedEntity, FeedRole, FeedSingularRole } from '../shared/types';
import { FEED_VIEWER } from './keys';
import { isViewer, you, VIEWER_CLASSES } from '../shared/viewer';

// The page's reader, named "You" wherever a headline names them (ui#75).
const viewer = inject(FEED_VIEWER, null);

const props = defineProps<{
    template: string | null;
    /** Pre-rendered fallback for closure-based grammar; template wins when present. */
    headline?: string | null;
    /** Singular slots — only ever filled for roles the axis pins. */
    entities: FeedEntities;
    /** Aggregate context (group nodes): sample lists and their true totals. */
    sample?: Partial<Record<FeedRole, FeedEntity[]>>;
    distinct?: Partial<Record<FeedRole, number>>;
    count?: number;
    /** Last-resort fallback when no grammar was authored at all. */
    verb: string | null;
    /**
     * Group nodes must never fall back to singular prose: a null headline
     * means the package refused to name roles the axis does not pin, so
     * naming one actor here would re-introduce the lie server-side.
     */
    aggregate?: boolean;
}>();

type Part =
    | { type: 'text'; text: string }
    | { type: 'entity'; role: FeedSingularRole }
    | { type: 'list'; role: FeedRole }
    | { type: 'count' }
    | { type: 'others' };

const PLURALS: Record<string, FeedRole> = {
    ':actors': 'actors',
    ':objects': 'objects',
    ':targets': 'targets',
    ':contexts': 'contexts',
    ':instruments': 'instruments',
    ':origins': 'origins',
    ':results': 'results',
    ':locations': 'locations',
    ':generators': 'generators',
};

// One generic pass over /:(\w+)/ — new tokens in the payload never require
// a renderer change: known tokens resolve, unknown tokens render literally.
const parts = computed<Part[]>(() => {
    if (!props.template) {
        return [];
    }

    return props.template
        .split(/(:[a-z_]+)/g)
        .filter((segment) => segment.length > 0)
        .map((segment): Part => {
            if (segment in PLURALS) {
                return { type: 'list', role: PLURALS[segment]! };
            }

            switch (segment) {
                case ':actor':
                case ':object':
                case ':target':
                case ':context':
                case ':instrument':
                case ':origin':
                case ':result':
                case ':location':
                case ':generator':
                    return {
                        type: 'entity',
                        role: segment.slice(1) as FeedSingularRole,
                    };
                case ':count':
                    return { type: 'count' };
                case ':others':
                    return { type: 'others' };
                default:
                    return { type: 'text', text: segment };
            }
        });
});

function shown(role: FeedRole): FeedEntity[] {
    return props.sample?.[role] ?? [];
}

/**
 * The collapsed remainder for a role: what the server counted, minus what it
 * gave us names for. A pinned role is a list of one with nothing left over.
 *
 * Note this is `distinct - shown`, never `- 1`: the sample list may hold
 * several names, and subtracting one would overcount every time it does.
 */
function overflow(role: FeedRole): number {
    return Math.max(0, (props.distinct?.[role] ?? 0) - shown(role).length);
}

const actorOverflow = computed(() => overflow('actors'));
</script>

<template>
    <span class="sf-headline leading-[1.6] text-muted-foreground [overflow-wrap:anywhere]">
        <template v-if="parts.length > 0">
            <template v-for="(part, index) in parts" :key="index">
                <template v-if="part.type === 'text'">{{ part.text }}</template>

                <span v-else-if="part.type === 'entity' && isViewer(viewer, entities[part.role])" :class="VIEWER_CLASSES">{{ you(index === 0) }}</span>

                <EntityLink
                    v-else-if="part.type === 'entity'"
                    :entity="entities[part.role] ?? null"
                    :fallback="part.role === 'actor' ? 'Someone' : undefined"
                />

                <!--
                    Plural roles read the sample list and append the true
                    remainder, so the collapsed dimension is named rather than
                    counted: "Onboarding Portal, Analytics Dashboard and 2 more".
                -->
                <template v-else-if="part.type === 'list'">
                    <template
                        v-for="(entity, entityIndex) in shown(part.role)"
                        :key="entity.id"
                    >
                        <span v-if="isViewer(viewer, entity)" :class="VIEWER_CLASSES">{{ you(index === 0 && entityIndex === 0) }}</span><EntityLink v-else :entity="entity" /><template
                            v-if="
                                overflow(part.role) === 0 &&
                                entityIndex === shown(part.role).length - 2
                            "
                        >
                            and </template
                        ><template
                            v-else-if="entityIndex < shown(part.role).length - 1"
                            >,
                        </template>
                    </template>
                    <template v-if="overflow(part.role) > 0">
                        and {{ overflow(part.role) }} more</template
                    >
                </template>

                <template v-else-if="part.type === 'count'">{{
                    count ?? 0
                }}</template>

                <template v-else-if="part.type === 'others'"
                    >{{ actorOverflow }} others</template
                >
            </template>
        </template>

        <template v-else-if="headline">{{ headline }}</template>

        <!--
            No grammar authored. Groups get the count only — the avatar stack
            names who, the children carry what. Activities keep singular prose,
            where every role is genuinely the one activity's own.
        -->
        <template v-else-if="aggregate"> {{ count ?? 0 }} activities </template>

        <template v-else>
            <span v-if="isViewer(viewer, entities.actor)" :class="VIEWER_CLASSES">{{ you(true) }}</span>
            <EntityLink v-else :entity="entities.actor ?? null" fallback="Someone" />
            <template v-if="verb">{{ ' ' + verb }}</template>
            <template v-if="entities.object">
                {{ ' ' }}<EntityLink :entity="entities.object" />
            </template>
        </template>
    </span>
</template>
