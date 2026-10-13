---
name: storyfeed-ui
description: Render Storyfeed activity feeds with storyfeed/ui's Blade, Vue or React kit. Use when installing a kit (php artisan storyfeed:ui vue or react, or importing from vendor through a Vite alias), adding the Tailwind @plugin and @source lines, rendering <x-storyfeed::feed>, Vue's FeedStream or React's FeedProvider and FeedStream, setting image-size, the viewer, rails or dense child rows, providing FEED_LINK, FEED_BODIES, FEED_VIEWER and the other FEED_* seams, retuning tokens through @theme, or replacing a body renderer such as Image without losing image sizing.
---

# Storyfeed UI

`storyfeed/ui` draws the page that core (`storyfeed/storyfeed`) returns. It has three kits with the same output: Blade (registered by the package), Vue 3 and React 19 for Inertia. Storyfeed is pre-1.0: when unsure, read the package README or the docs at https://docs.storyfeed.dev rather than guessing a prop. Recording activities, headlines and bodies belong to core's `storyfeed-development` skill.

## Rules

- Tailwind CSS v4 is mandatory. The kits ship literal Tailwind utilities and no stylesheet: there is nothing to import. The app's Tailwind build must scan the kit with an `@source` line.
- Colours come from the Laravel starter-kit tokens (`background`, `foreground`, `card`, `muted`, `muted-foreground`, `primary`, `primary-foreground`, `border`, `ring`). Retune them, and the kit's `--sf-*` variables, in the app's `@theme` or on an element around the feed.
- Never copy kit markup into app views, never add a CSS file for the feed, and never assert the kit's class names (`sf-*` or utilities) in the app's tests. Assert the app's own output instead, such as the headline text or a link's `href`.
- A copied kit belongs to the app. Re-run the copy command with `--diff` to review an update, and `--force` to replace files the app edited.

## Install a kit

All three kits need the Typography plugin:

```bash
composer require storyfeed/ui
npm install -D @tailwindcss/typography
```

### Blade

Nothing to copy. Add the plugin and the views to `resources/css/app.css` (paths are relative to that file):

```css
@plugin "@tailwindcss/typography";
@source "../../vendor/storyfeed/ui/resources/views";
```

Publish the views only to change their markup: `php artisan vendor:publish --tag=storyfeed-views`.

### Vue (copied)

```bash
php artisan storyfeed:ui vue
npm install lucide-vue-next micromark micromark-extension-gfm-autolink-literal micromark-extension-gfm-strikethrough micromark-extension-gfm-table micromark-extension-gfm-task-list-item sanitize-html
```

The kit lands in `resources/js/components/storyfeed` (change it with `--path`), with its own `shared/` directory. Scan it:

```css
@plugin "@tailwindcss/typography";
@source "../js/components/storyfeed";
```

### React (copied)

```bash
php artisan storyfeed:ui react
npm install react@^19 react-dom@^19 lucide-react micromark micromark-extension-gfm-autolink-literal micromark-extension-gfm-strikethrough micromark-extension-gfm-table micromark-extension-gfm-task-list-item sanitize-html
npm install -D @types/react @types/react-dom @types/sanitize-html
```

The destination, `--path` and the `@source "../js/components/storyfeed";` scan are the same as Vue's.

### Vue or React from vendor (no copy)

Point a Vite alias at the package's JS directory instead of copying:

```ts
import { fileURLToPath } from 'node:url';

// Merge into defineConfig's resolve.alias:
const alias = {
    '@storyfeed': fileURLToPath(new URL('./vendor/storyfeed/ui/resources/js', import.meta.url)),
};
```

Import Vue components from `@storyfeed/vue/FeedStream.vue`, React exports from `@storyfeed/react`, and shared helpers from `@storyfeed/shared/body`. Install the same npm packages as the copied kit, and scan the parent `resources/js` directory, not only `vue/` or `react/`, because the image-size utilities live in `shared/`:

```css
@plugin "@tailwindcss/typography";
@source "../../vendor/storyfeed/ui/resources/js";
```

Keep the `resources/views` scan as well if the app also renders Blade feeds.

## Render a feed with sized images

A row draws a picture only when one of its bodies asks for one, so give the entity an Image body in core (`Storyfeed\Body\Image::make($src)->size('card')` in `toFeed()`), then pass a page of the feed to the view.

```php
use Inertia\Inertia;
use Storyfeed\Facades\Storyfeed;

return Inertia::render('History', [
    'feed' => Storyfeed::feed()->cursorPaginate(15),
]);
```

The feed's `image-size` (React: `imageSize`) sets the default size for every picture: `thumbnail`, `inline`, `card`, `feature` or `full`. A body's own `size()` wins, including an explicit `full`. Pictures scale down, keep their shape and are never cropped.

Blade:

```blade
<x-storyfeed::feed :page="$page" image-size="card" />
```

Vue:

```vue
<script setup lang="ts">
import FeedStream from '@/components/storyfeed/FeedStream.vue';
import type { FeedPagePayload } from '@/components/storyfeed/types';

defineProps<{ feed: FeedPagePayload }>();
</script>

<template>
    <FeedStream :page="feed" image-size="card" @load-more="() => { /* load and append the next page */ }" />
</template>
```

React:

```tsx
import { Link } from '@inertiajs/react';
import { FeedProvider, FeedStream } from '@/components/storyfeed';
import type { FeedPagePayload } from '@/components/storyfeed';

export default function History({ feed }: { feed: FeedPagePayload }) {
    return (
        <FeedProvider FEED_LINK={Link}>
            <FeedStream page={feed} imageSize="card" onLoadMore={() => { /* load and append the next page */ }} />
        </FeedProvider>
    );
}
```

Retune a size's limits with `--sf-image-size-<name>` and `--sf-image-size-<name>-height`:

```css
@theme {
    --sf-image-size-card: 20rem;
    --sf-image-size-card-height: 15rem;
}
```

## Feed props

| Blade / Vue | React | Does |
|---|---|---|
| `page` | `page` | core's page: a paginator, a collection, or its JSON |
| `image-size` | `imageSize` | default picture size for the feed |
| `rail` | `rail` | `actor`, `activity`, `actor-only` (default) or `activity-only` |
| `child-rail` | `childRail` | the rail of dense rows (expanded group members) |
| `grouped` | `grouped` | `false` hides day headings |
| `dividers` | `dividers` | labels drawn before item ids |
| `divider-style` | `dividerStyle` | `branch` (default) or `dot` |
| `interactive`, `collapsed` | `interactive`, `collapsed` | group disclosure and its initial state |

Blade also takes `viewer` (a model), `timezone` and `renderers`. Vue emits `load-more`; React takes `onLoadMore`, `loadingMore` and `empty`.

**Dense rows.** A group's expanded members draw as dense rows: the same row without the rail's secondary badge. `child-rail` (React `childRail`) sets their posture independently, for example `rail="actor" child-rail="activity-only"`.

**Size.** Set `--sf-font-size` on the feed or an element around it to scale the whole feed, for example `class="[--sf-font-size:0.875rem]"` for a compact one. `--sf-well` and `--sf-well-border` set the fill and edge of card-shaped bodies.

**The viewer reads as "You".** Name who is reading and headlines that name them say "You". The payload stays the same for every reader.

- Blade: `<x-storyfeed::feed :page="$page" :viewer="auth()->user()" />`
- Vue: `app.provide(FEED_VIEWER, { type: 'user', id: user.id })`, with `FEED_VIEWER` from `@/components/storyfeed/keys`
- React: `<FeedProvider FEED_VIEWER={`user:${user.id}`}>`

## FEED_* provides

Vue provides these keys from `@/components/storyfeed/keys` (`app.provide()` or `provide()`); React passes them as `FeedProvider` props, and nested providers merge.

| Key | Takes |
|---|---|
| `FEED_LINK` | the link component, such as Inertia's `Link`; receives `href`, entity attributes and `modal` |
| `FEED_BODIES` | a map of exact body types to renderers |
| `FEED_COMPONENTS` | a map of app-owned names for `Storyfeed/Body/Component` bodies |
| `FEED_MEDIA` | a component that draws every picture, such as a lightbox |
| `FEED_VIEWER` | the reader, `{ type, id }` or `'type:id'` |
| `FEED_NOW` | a fixed "now" in milliseconds, for static or SSR pages |
| `FEED_FILE_LABELLER` | `({ name, mediaType }) => label or null` |
| `FEED_MEDIA_OBJECT_PLACEMENT` | `'beside'` (default) or `'below'` |

```ts
import { createApp } from 'vue';
import { Link } from '@inertiajs/vue3';
import { FEED_LINK } from '@/components/storyfeed/keys';

createApp(App).provide(FEED_LINK, Link);
```

## Replace a body renderer

A renderer is registered for an exact body type, such as `Acme/Shipment`, and receives the body's `payload` with the entity's `entityLabel`, `entityUrl` and `entityMedia`. One registered for a core type, such as `Storyfeed/Body/Image`, replaces the kit's. In Vue, install maps with the `feedBodies()` plugin (each install merges); in React, pass `FEED_BODIES` to `FeedProvider`. In Blade, a type maps to a view: `Acme/Shipment` draws `resources/views/vendor/storyfeed/components/body/acme/shipment.blade.php`.

To keep image sizing in a replacement Image renderer, draw the picture with `FeedMedia` (`<x-storyfeed::media>` in Blade) and pass the body as `payload`. `FeedMedia` reads the feed's size, and the body's own `size()` overrides it.

Vue, registered with `app.use(feedBodies({ 'Storyfeed/Body/Image': LinkedImage }))`, with `feedBodies` from `@/components/storyfeed/body`:

```vue
<script setup lang="ts">
import { computed } from 'vue';
import FeedMedia from '@/components/storyfeed/FeedMedia.vue';
import { pictureOf } from '@/components/storyfeed/shared/body';

const props = defineProps<{
    payload: Record<string, any>;
    entityMedia?: Record<string, any> | null;
    entityUrl?: string | null;
}>();
const picture = computed(() => pictureOf(props.payload, props.entityMedia));
</script>

<template>
    <FeedMedia v-if="picture" :image="picture" :payload="payload" :href="entityUrl" />
</template>
```

React:

```tsx
import { FeedMedia, FeedProvider, type BodyProps } from '@/components/storyfeed';
import { pictureOf } from '@/components/storyfeed/shared/body';

function LinkedImage({ payload, entityMedia, entityUrl }: BodyProps) {
    const picture = pictureOf(payload, entityMedia);
    return picture ? <FeedMedia image={picture} payload={payload} href={entityUrl} /> : null;
}

<FeedProvider FEED_BODIES={{ 'Storyfeed/Body/Image': LinkedImage }}>…</FeedProvider>
```

Blade, in `resources/views/vendor/storyfeed/components/body/image.blade.php`:

```blade
@props(['body', 'entity' => null])
@php
    $picture = \Storyfeed\Ui\Support\Bodies::picture($body, $entity);
    $link = \Storyfeed\Ui\Support\Links::entity($entity);
@endphp
@if ($picture)
    <x-storyfeed::media :image="$picture" :payload="$body"
        :href="$link['href'] ?? null" :link-attributes="$link['attributes'] ?? []" />
@endif
```

With the vendor alias, import from `@storyfeed/vue/FeedMedia.vue`, `@storyfeed/react` and `@storyfeed/shared/body` instead.

A Blade `Storyfeed/Body/Component` body draws an app component registered with `app(BodyComponents::class)->register('App/Message', 'feed.message')` (`Storyfeed\Ui\Support\BodyComponents`); unregistered names draw nothing.

## Testing

Test the app's output, not the kit's: assert headline text, entity names or link targets. The kit's markup and classes change between releases and are covered by the package's own tests.
