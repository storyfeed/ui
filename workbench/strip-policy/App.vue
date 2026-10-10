<script setup lang="ts">
import { provide, ref, watchEffect } from 'vue';
import FeedStream from '../../resources/js/vue/FeedStream.vue';
import { FEED_NOW } from '../../resources/js/vue/keys';
import cases from './cases.json';
import { variants } from './policy';
import type { GroupNode } from '../../resources/js/shared/types';

const params = new URLSearchParams(location.search);
const dark = ref(params.get('theme') === 'dark');
watchEffect(() => document.documentElement.classList.toggle('dark', dark.value));
provide(FEED_NOW, Date.parse('2026-08-14T15:00:00Z'));

const rows = cases.map(example => ({ name: example.name, variants: variants(example.items[0] as unknown as GroupNode) }));
</script>

<template>
    <main class="mx-auto max-w-[1600px] px-4 py-8 sm:px-8">
        <header class="mb-8 flex flex-wrap items-baseline justify-between gap-4">
            <div>
                <h1 class="text-2xl font-semibold">Group strip policy</h1>
                <p class="mt-1 max-w-3xl text-sm text-muted-foreground">
                    Proposal: the strip shows what varies across the members, and only when it's worth seeing. Real core output, drawn by the unchanged Vue kit with <code>rail="actor"</code>, collapsed.
                </p>
            </div>
            <button type="button" class="rounded-md border border-border px-3 py-1 text-sm" @click="dark = !dark">{{ dark ? 'Light' : 'Dark' }}</button>
        </header>

        <section v-for="(row, index) in rows" :key="row.name" class="border-t border-border py-8" :data-case="index + 1">
            <h2 class="mb-5 text-lg font-semibold">{{ index + 1 }}. {{ row.name }}</h2>
            <div class="grid gap-6 [grid-template-columns:repeat(auto-fill,minmax(340px,1fr))]">
                <article v-for="variant in row.variants" :key="variant.key" class="min-w-0 rounded-xl border border-border p-4" :class="variant.key === 'current' ? 'border-dashed' : ''">
                    <h3 class="text-sm font-semibold">{{ variant.title }}</h3>
                    <p class="mb-4 text-xs text-muted-foreground">{{ variant.rule }}</p>
                    <FeedStream :items="[variant.group]" :grouped="false" rail="actor" :collapsed="true" />
                </article>
            </div>
        </section>
    </main>
</template>
