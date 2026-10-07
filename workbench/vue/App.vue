<script setup lang="ts">
import { provide, h } from 'vue';
import FeedStream from '../../resources/js/vue/FeedStream.vue';
import ReferenceFeed from 'reference-feed';
import { FEED_NOW, FEED_COMPONENTS } from '../../resources/js/vue/keys';
import { FEED_NOW as REFERENCE_NOW } from 'reference-keys';
import payload from './sample-payload.json';
import type { FeedNode } from '../../resources/js/vue/types';

const parity = __PARITY__;
const dark = new URLSearchParams(location.search).get('theme') === 'dark';
document.documentElement.classList.toggle('dark', dark);
const now = Date.parse('2026-08-14T15:00:00Z');
provide(FEED_NOW, now);
provide(REFERENCE_NOW, now);
provide(FEED_COMPONENTS, { 'App/Message': { props: ['message'], render() { return h('strong', this.message); } } });
const panes = parity ? [{ name: 'Reference', component: ReferenceFeed, css: 'reference' }, { name: 'Tailwind', component: FeedStream, css: 'converted' }] : [{ name: 'Tailwind', component: FeedStream, css: 'converted' }];
const entity = { type: 'person', id: 'ada', label: 'Ada Lovelace', url: '#ada', media: null, data: null, tombstone: null };
const picture = { src: 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="160" height="100"><rect width="160" height="100" fill="#6b7785"/><circle cx="80" cy="50" r="28" fill="#e2e5e9"/></svg>'), width: 160, height: 100, alt: 'Illustrated preview' };
const forms = [
    { $body: 'Storyfeed/Body/KeyValue', title: 'Order', items: [{ key: 'Status', value: 'Ready' }, { key: 'Paid', value: true }, { key: 'Notes', value: null, placeholder: 'None' }, { key: 'ID', value: 'ABC-123-456', verbatim: true }] },
    { $body: 'Storyfeed/Body/Prose', title: 'Plain prose', content: 'A line of authored text.\nA second line stays separate.' },
    { $body: 'Storyfeed/Body/Prose', title: 'Rich prose', mediaType: 'text/markdown', content: '## Ready\n\n**Confirmed** with [details](https://example.com).\n\n- First\n- Second\n\n> A quotation\n\n```\ncode\n```' },
    { $body: 'Storyfeed/Body/Prose', title: 'Verbatim', verbatim: true, content: 'Order #1042\n  status: ready\n  result: <confirmed>' },
    { $body: 'Storyfeed/Body/Excerpt', text: 'A lovely afternoon.\nWe will return', from: 'Review', truncated: true },
    { $body: 'Storyfeed/Body/ItemList', title: 'Checklist', ordered: true, items: ['First', { label: 'Second', href: '#second' }], totalItems: 4, more: { label: 'See all', href: '#all' } },
    { $body: 'Storyfeed/Body/FileAttachment', name: 'invoice.pdf', size: 2400000, mediaType: 'application/pdf' },
    { $body: 'Storyfeed/Body/Image', image: 'preview', caption: 'An illustrated preview' },
    { $body: 'Storyfeed/Body/MediaObject', subject: { label: 'A post', href: '#post' }, content: 'Some text accompanies this image.', image: 'preview', files: [{ name: 'menu.pdf', href: '#menu', mediaType: 'application/pdf' }], footnote: 'Small print' },
];
const bodyItems = forms.map((body, i) => ({ kind: 'activity', id: `body-${i}`, verb: 'posted', published_at: '2026-08-14T12:00:00Z', headline_template: ':actor posted :object', actor: entity, object: { ...entity, id: `object-${i}`, label: body.title ?? 'a preview', body: [body], media: { preview: picture } }, target: null, context: null, glyph: 'file-up' })) as FeedNode[];
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
        </article>
    </main>
</template>
