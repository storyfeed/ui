// The README's closing frame, rendered by the Vue and React kits from the
// payload core serialized (build/readme/payload.json). kits.mjs reads the
// markup each kit mounts.
import { createApp, h } from 'vue';
import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import VueFeed from '../../../resources/js/vue/FeedStream.vue';
import { FEED_NOW } from '../../../resources/js/vue/keys';
import { FeedProvider, FeedStream as ReactFeed } from '../../../resources/js/react';
import payload from '../../../build/readme/payload.json';

const app = createApp({ render: () => h(VueFeed, { items: payload.items, rail: 'actor' }) });
app.provide(FEED_NOW, payload.now);
app.mount('#vue');
createRoot(document.getElementById('react')!).render(createElement(FeedProvider, { FEED_NOW: payload.now }, createElement(ReactFeed, { items: payload.items as any, rail: 'actor' })));
