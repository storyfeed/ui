<script setup lang="ts">
import { nextTick, onMounted, provide, reactive, ref, watchEffect } from 'vue';
import FeedStream from '../../resources/js/vue/FeedStream.vue';
import { FEED_NOW } from '../../resources/js/vue/keys';
import cases from './cases.json';
import { always, beyond, none, type Variant } from './policy';
import ActorStack from './ActorStack.vue';
import type { GroupNode } from '../../resources/js/shared/types';

const params = new URLSearchParams(location.search);
const dark = ref(params.get('theme') === 'dark');
watchEffect(() => document.documentElement.classList.toggle('dark', dark.value));
provide(FEED_NOW, Date.parse('2026-08-14T15:00:00Z'));

const crowd = cases.crowd as unknown as GroupNode;
const small = cases.small as unknown as GroupNode;

const sections: { title: string; note: string; group: GroupNode; variants: Variant[] }[] = [
    { title: '1. When it appears: 35 people', note: '8 faces at 24px.', group: crowd, variants: [none(), always(crowd, 8), beyond(crowd, 8)] },
    { title: '1b. When it appears: 5 people', note: 'The same three rules on a small group, where the headline names three of five.', group: small, variants: [none(), always(small, 8), beyond(small, 8)] },
    { title: '2. How many faces: always', note: '35 people, 24px.', group: crowd, variants: [always(crowd, 5), always(crowd, 8), always(crowd, 12)] },
    { title: '3. How many faces: beyond the headline', note: '35 people, 24px.', group: crowd, variants: [beyond(crowd, 5), beyond(crowd, 8), beyond(crowd, 12)] },
    { title: '4. Face size', note: 'Always, 8 faces. The rail disc is 32px; a member row\'s face is 24px.', group: crowd, variants: [always(crowd, 8, 20), always(crowd, 8, 24), always(crowd, 8, 32)] },
];

/**
 * The principle check: every face in the collapsed stack must reappear as a
 * member row's face once expanded. Read from the rendered DOM.
 */
const checks = reactive<Record<string, { face: string; found: boolean }[]>>({});
onMounted(async () => {
    await nextTick();
    document.querySelectorAll('[data-variant]').forEach(card => {
        const stack = card.querySelector('.collapsed .sf-actor-stack');
        const rowFaces = new Set([...card.querySelectorAll('.expanded .sf-children .sf-avatar')].map(face => face.getAttribute('aria-label')));
        checks[card.getAttribute('data-variant')!] = stack
            ? [...stack.querySelectorAll('.sf-avatar')].map(face => ({ face: face.getAttribute('aria-label')!, found: rowFaces.has(face.getAttribute('aria-label')) }))
            : [];
    });
});
</script>

<template>
    <main class="mx-auto max-w-[1600px] px-4 py-8 sm:px-8">
        <header class="mb-8 flex flex-wrap items-baseline justify-between gap-4">
            <div>
                <h1 class="text-2xl font-semibold">Actor strip</h1>
                <p class="mt-1 max-w-3xl text-sm text-muted-foreground">
                    ui#48. Check-in groups as core writes them (default config), drawn by the unchanged Vue kit with <code>rail="actor"</code>, so members draw their faces. The stack is a workbench mock in the group's body slot; it hides when the group expands, like the feature strip. Faces come from the members, newest first; core sends 25 of the 35 (<code>children_limit</code>).
                </p>
            </div>
            <button type="button" class="rounded-md border border-border px-3 py-1 text-sm" @click="dark = !dark">{{ dark ? 'Light' : 'Dark' }}</button>
        </header>

        <section v-for="section in sections" :key="section.title" class="border-t border-border py-8" :data-section="section.title">
            <h2 class="text-lg font-semibold">{{ section.title }}</h2>
            <p class="mb-5 text-sm text-muted-foreground">{{ section.note }}</p>
            <div class="grid gap-6 [grid-template-columns:repeat(auto-fill,minmax(360px,1fr))]">
                <article v-for="variant in section.variants" :key="variant.key" class="min-w-0 rounded-xl border border-border p-4" :class="variant.key === 'none' ? 'border-dashed' : ''" :data-variant="section.title + variant.key">
                    <h3 class="text-sm font-semibold">{{ variant.title }}</h3>
                    <p class="mb-4 text-xs text-muted-foreground">{{ variant.rule }}</p>
                    <div class="collapsed">
                        <FeedStream :items="[section.group]" :grouped="false" rail="actor" :collapsed="true">
                            <template #body="{ node }"><ActorStack v-if="variant.stack && node.kind === 'group'" v-bind="variant.stack" /></template>
                        </FeedStream>
                    </div>
                    <p class="mt-4 mb-2 border-t border-border pt-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Expanded</p>
                    <div class="expanded max-h-80 overflow-y-auto">
                        <FeedStream :items="[section.group]" :grouped="false" rail="actor" :collapsed="false" />
                    </div>
                    <div class="mt-3 rounded-lg bg-muted px-3 py-2 text-xs" data-check>
                        <p class="font-semibold">Principle check</p>
                        <p v-if="!checks[section.title + variant.key]?.length" class="text-muted-foreground">No stack: nothing to check.</p>
                        <p v-else-if="checks[section.title + variant.key]!.every(r => r.found)" class="text-muted-foreground">✓ all {{ checks[section.title + variant.key]!.length }} faces reappear as member rows' faces.</p>
                        <p v-for="(result, i) in (checks[section.title + variant.key] ?? []).filter(r => !r.found)" :key="i" class="font-semibold text-red-700 dark:text-red-400">✗ {{ result.face }}: not in the expansion (misleading)</p>
                    </div>
                </article>
            </div>
        </section>
    </main>
</template>
