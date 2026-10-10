<script setup lang="ts">
import { nextTick, onMounted, provide, reactive, ref, watchEffect } from 'vue';
import FeedStream from '../../resources/js/vue/FeedStream.vue';
import { FEED_NOW } from '../../resources/js/vue/keys';
import cases from './cases.json';
import { variants } from './policy';
import MockStrip from './MockStrip.vue';
import type { GroupNode } from '../../resources/js/shared/types';

const params = new URLSearchParams(location.search);
const dark = ref(params.get('theme') === 'dark');
watchEffect(() => document.documentElement.classList.toggle('dark', dark.value));
provide(FEED_NOW, Date.parse('2026-08-14T15:00:00Z'));

/**
 * The principle check: every tile in the strip must reappear in the expanded
 * member rows. Read from the rendered expanded copy, not from the payload.
 */
const checks = reactive<Record<string, { tile: string; found: string | null }[]>>({});
function check(card: Element): { tile: string; found: string | null }[] {
    const strip = card.querySelector('.sf-media-strip');
    const rows = card.querySelector('.sf-children');
    if (!strip || !rows) return [];
    const imgs = [...rows.querySelectorAll('img')];

    return [...strip.children].filter(tile => !tile.classList.contains('sf-media-strip__more')).map(tile => {
        const img = tile.matches('img') ? tile : tile.querySelector('img:not(.sf-avatar__image)');
        if (img) {
            const src = img.getAttribute('src')!;
            const match = imgs.find(other => other.getAttribute('src') === src);
            const where = match?.closest('.sf-avatar') ? 'a member\'s face' : match?.closest('.sf-object-media') ? 'a member\'s thumbnail' : 'a member\'s Image body';

            return { tile: `picture "${img.getAttribute('alt') || src.slice(-20)}"`, found: match ? where : null };
        }
        const avatar = tile.querySelector('.sf-avatar') ?? (tile.matches('.sf-avatar') ? tile : null);
        if (avatar) {
            const label = avatar.getAttribute('aria-label')!;
            const face = [...rows.querySelectorAll('.sf-avatar')].some(other => other.getAttribute('aria-label') === label);

            return { tile: `avatar "${label}"`, found: face ? 'a member\'s rail face' : null };
        }
        const label = tile.textContent!.trim();

        return { tile: `name "${label}"`, found: [...rows.querySelectorAll('.sf-head')].some(head => head.textContent!.includes(label)) ? 'a member\'s headline' : null };
    });
}
onMounted(async () => {
    await nextTick();
    document.querySelectorAll('[data-variant]').forEach(card => { checks[card.getAttribute('data-variant')!] = check(card.querySelector('.expanded')!); });
});

const rows = cases.map(example => ({ name: example.name, variants: variants(example.items[0] as unknown as GroupNode) }));
</script>

<template>
    <main class="mx-auto max-w-[1600px] px-4 py-8 sm:px-8">
        <header class="mb-8 flex flex-wrap items-baseline justify-between gap-4">
            <div>
                <h1 class="text-2xl font-semibold">Group strip policy</h1>
                <p class="mt-1 max-w-3xl text-sm text-muted-foreground">
                    Governing principle: a tile may only show what the expanded member rows render. Each card shows the collapsed group, its expansion, and a check of every tile against that expansion. Real core output, drawn by the unchanged Vue kit with <code>rail="actor"</code>; members inherit it unless a card sets <code>child-rail</code>.
                </p>
            </div>
            <button type="button" class="rounded-md border border-border px-3 py-1 text-sm" @click="dark = !dark">{{ dark ? 'Light' : 'Dark' }}</button>
        </header>

        <section v-for="(row, index) in rows" :key="row.name" class="border-t border-border py-8" :data-case="index + 1">
            <h2 class="mb-5 text-lg font-semibold">{{ index + 1 }}. {{ row.name }}</h2>
            <div class="grid gap-6 [grid-template-columns:repeat(auto-fill,minmax(340px,1fr))]">
                <article v-for="variant in row.variants" :key="variant.key" class="min-w-0 rounded-xl border border-border p-4" :class="variant.key === 'current' ? 'border-dashed' : ''" :data-variant="row.name + variant.key">
                    <h3 class="text-sm font-semibold">{{ variant.title }}</h3>
                    <p class="mb-4 text-xs text-muted-foreground">{{ variant.rule }}</p>
                    <FeedStream :items="[variant.group]" :grouped="false" rail="actor" :child-rail="(variant.childRail as any) ?? null" :collapsed="true">
                        <template #body="{ node }"><MockStrip v-if="variant.mock && node.kind === 'group'" v-bind="variant.mock" /></template>
                    </FeedStream>
                    <p class="mt-4 mb-2 border-t border-border pt-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Expanded</p>
                    <div class="expanded">
                        <FeedStream :items="[variant.group]" :grouped="false" rail="actor" :child-rail="(variant.childRail as any) ?? null" :collapsed="false">
                            <template #body="{ node }"><MockStrip v-if="variant.mock && node.kind === 'group'" v-bind="variant.mock" /></template>
                        </FeedStream>
                    </div>
                    <div class="mt-3 rounded-lg bg-muted px-3 py-2 text-xs" data-check>
                        <p class="font-semibold">Principle check</p>
                        <p v-if="!checks[row.name + variant.key]?.length" class="text-muted-foreground">No strip: nothing to check.</p>
                        <p v-for="(result, i) in checks[row.name + variant.key] ?? []" :key="i" :class="result.found ? 'text-muted-foreground' : 'font-semibold text-red-700 dark:text-red-400'">
                            {{ result.found ? '✓' : '✗' }} {{ result.tile }}: {{ result.found ? `reappears as ${result.found}` : 'not in the expansion (misleading)' }}
                        </p>
                    </div>
                </article>
            </div>
        </section>
    </main>
</template>
