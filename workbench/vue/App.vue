<script setup lang="ts">
import { provide, h } from 'vue';
import MediaObject from '../../resources/js/vue/body/MediaObject.vue';
import FeedStream from '../../resources/js/vue/FeedStream.vue';
import ReferenceFeed from 'reference-feed';
import { FEED_NOW, FEED_COMPONENTS } from '../../resources/js/vue/keys';
import { FEED_NOW as REFERENCE_NOW } from 'reference-keys';
import payload from './sample-payload.json';
import bodies from './body-payload.json';
import cases from './cases.json';
import type { FeedNode } from '../../resources/js/vue/types';

const parity = __PARITY__;
const dark = new URLSearchParams(location.search).get('theme') === 'dark';
document.documentElement.classList.toggle('dark', dark);
const now = Date.parse('2026-08-14T15:00:00Z');
provide(FEED_NOW, now);
provide(REFERENCE_NOW, now);
provide(FEED_COMPONENTS, { 'App/Message': { props: ['message'], render() { return h('strong', this.message); } } });
const panes = parity ? [{ name: 'Reference', component: ReferenceFeed, css: 'reference' }, { name: 'Tailwind', component: FeedStream, css: 'converted' }] : [{ name: 'Tailwind', component: FeedStream, css: 'converted' }];
const bodyItems = bodies as FeedNode[];
const post = bodies.find(item => item.object?.body?.some(body => body.$body === 'Storyfeed/Body/MediaObject'))!.object!;
const postBody = post.body![0];
const objectIcon = (node: FeedNode) => node.object?.media?.icon ?? null;
const rails = ['actor', 'activity', 'actor-only', 'activity-only'] as const;
</script>

<template>
    <main class="comparison" :class="{ single: !parity }">
        <article v-for="pane in panes" :key="pane.name" class="pane" :class="pane.css">
            <h1>{{ pane.name }}</h1>
            <component :is="pane.component" :items="(payload.items as FeedNode[])" :next-cursor="payload.next_cursor" />
            <section class="example"><h2>Generic body forms</h2><component :is="pane.component" :items="bodyItems" :grouped="false" /></section>
            <section v-for="rail in rails" :key="rail" class="example"><h2>{{ rail }}</h2><component :is="pane.component" :items="bodyItems.slice(0, 1)" :grouped="false" :rail="rail" /></section>
            <section class="example"><h2>Per-item divider</h2><component :is="pane.component" :items="bodyItems.slice(0, 1)" :grouped="false" :dividers="{ 'body-0': 'Timeline' }" /></section>
            <section v-if="pane.name === 'Tailwind'" class="example"><h2>Branch divider (extension)</h2><FeedStream :items="bodyItems.slice(0, 1)" :grouped="false" :dividers="{ 'body-0': 'Timeline' }" divider-style="branch" /></section>
            <section v-for="example in cases" :key="example.name" class="example"><h2>{{ example.name }}</h2><component :is="pane.component" :items="(example.items as FeedNode[])" :rail="(example.rail as any) ?? null" :child-rail="(example.childRail as any) ?? null" :grouped="example.grouped ?? false" :interactive="example.interactive ?? true" :collapsed="example.collapsed ?? null" :object-icon="example.objectIcon ? objectIcon : undefined" /></section>
            <section class="example"><h2>MediaObject below</h2><div class="sf-feed text-sm leading-[1.6] text-muted-foreground"><MediaObject :payload="postBody" :entity-media="post.media" :entity-url="post.url" image-placement="below" /></div></section>
        </article>
    </main>
</template>
