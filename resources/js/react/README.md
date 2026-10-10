# Storyfeed React kit

React 19 function components, TypeScript and Tailwind v4, compatible with the
Laravel React starter kit and Inertia 2/3's React adapter. Install with:

```sh
php artisan storyfeed:ui react
npm install react@^19 react-dom@^19 lucide-react micromark micromark-extension-gfm-autolink-literal micromark-extension-gfm-strikethrough micromark-extension-gfm-table micromark-extension-gfm-task-list-item sanitize-html
npm install -D @types/react @types/react-dom @types/sanitize-html @tailwindcss/typography
```

The default destination is `resources/js/components/storyfeed`. `--path` changes
it. The command copies the framework-free core into `shared/` within that
destination and rewrites the kit's relative imports, so the copy is self-contained.
Commit the copied files. Rerunning adds missing files, skips identical files, and
keeps and reports differing files, including shared translations. Use `--diff`
to review changes and `--force` to replace your edits.

Register the Typography plugin and, if needed, the kit in `resources/css/app.css`:

```css
@plugin "@tailwindcss/typography";
@source "../js/components/storyfeed";
```

Use Laravel starter-kit tokens: `background`, `foreground`, `card`, `muted`,
`muted-foreground`, `primary`, `primary-foreground`, `border`, and `ring`.
The kit adds no stylesheet. Rich `Prose`, `ItemList` and `Table` render inside
Typography's `prose`, coloured from the same tokens. Dark mode follows your
starter-kit tokens. The `sf-*` classes remain semantic hooks.

## Inertia example

```tsx
import { Link, router } from '@inertiajs/react';
import { FeedProvider, FeedStream } from '@/components/storyfeed';
import type { FeedPagePayload, FeedPayload } from '@/components/storyfeed';

// `feed` is core's page JSON: nodes under `data` from storyfeed/storyfeed#95, under `items` before it.
export default function History({ feed }: { feed: FeedPagePayload | FeedPayload }) {
    return (
        <FeedProvider FEED_LINK={Link}>
            <FeedStream
                page={feed}
                onLoadMore={() =>
                    router.get('/history', { cursor: feed.next_cursor })
                }
            />
        </FeedProvider>
    );
}
```

Use your app's append/merge pagination policy when loading older pages.
`loadingMore` disables the pager and changes its label while a request runs.
`empty` accepts a React node. `grouped={false}` hides day headings.

## Provider and render props

`FeedProvider` inherits surrounding options; explicitly supplied options win.
All provider names retain the Vue seams' meaning:

- `FEED_LINK`: a component accepting `href` and children. Entity attributes are
  forwarded; host components also receive `modal` when true, as does a
  CallToAction's action. Defaults to `a`.
- `FEED_BODIES`: a map of exact body types (`'Acme/Shipment'`) to renderers that
  receive `BodyProps`. Nested providers merge; one registered for a core type
  replaces the kit's. A type with no renderer draws its `$fallback` line as
  muted plain text, or nothing without one.
- `FEED_COMPONENTS`: a map of exact app-owned names to React components.
  `Storyfeed/Body/Component` forwards `payload.props`; unknown names render nothing.
- `FEED_FILE_LABELLER`: receives `{ name, mediaType }` and returns a label or null.
  Null uses the shared MIME map, then the MIME string. Names always remain visible;
  size uses decimal units. No extension guessing.
- `FEED_MEDIA_OBJECT_PLACEMENT`: `'beside'` (a compact picture beside the text) or
  `'below'` (picture after prose). Beside, a picture keeps its shape: an `icon` is a 4rem square; a picture with a declared `width` and `height` is 4rem tall at its own ratio, clamped between 1:1 and 2:1 (cropped only beyond that); one without shows whole at 6rem wide, up to 8rem tall. On a narrow card the picture stacks above the text.
  The `MediaObject` component's `imagePlacement` prop takes precedence.
- `FEED_NOW`: pins the clock to a millisecond timestamp after mount. Without it,
  relative labels refresh every second/minute/hour according to age; timers are
  cleaned up on unmount or clock/input changes.

`body` and `annotations` are functions receiving `{ node }`; `time` receives
`{ node, label }`. They work on activities, groups and expanded children.
Return null from `time` to omit time while retaining leftover role metadata.

```tsx
<FeedStream
    items={feed.items}
    body={({ node }) => <AppPreview node={node} />}
    annotations={({ node }) => <RevisionInfo id={node.id} />}
    time={({ node, label }) => (
        <Link href={`/activity/${node.id}`}>{label}</Link>
    )}
/>
```

SSR and the first hydration render use ISO timestamp/hover text and UTC date
keys for day headings. After mounting, labels use the browser's locale and
calendar timezone. This avoids hydration mismatches across clocks, locales,
timezones and midnight; no timer runs during `renderToString`. A pinned clock
stays pinned. This initial ISO presentation is React-specific.

## Rails, groups and bodies

`rail` takes `actor`, `activity`, `actor-only`, `activity-only`, or a structured
`Rail`. `childRail` independently overrides expanded members; dense children
suppress badges. Several actors draw as a diagonal pair inside one disc's
square: the first in front at the bottom-right with the glyph badge, the second
behind at the top-left, each 2/3 of the disc, with a smaller glyph badge in the usual place; below a 1.5rem (24px) disc only the front
face shows. A face badge never stands for several actors. Explicit singular payload slots pin roles; `distinct=1` does not.

Groups use native `<details>` with keyboard disclosure and no JavaScript state.
Unnamed groups start open. True member totals and truncation remain visible.
Below the headline, a group draws a strip: one tile per member activity, newest first, each the
thumbnail of what that activity features: its picture (an Image body, else
its icon), else that entity's avatar, its initials on its colour. Every tile
is the same rounded square, spaced, never overlapped, and links to its entity;
a deleted entity is a muted, unlinked tile. Up to four tiles; past that, three
and a "+N" tile counting the members not shown. On a group that can open, the "+N" tile opens and
closes it like "Show all N". A strip of identical tiles is
skipped. Expanding a group adds its members below and keeps the strip and the
rail faces in place. `FeedMediaStrip` draws tiles built with `strip()`.
Summary rendering has been removed from all kits, mirroring core. Unknown extra
payload keys are ignored.

`dividers={{ [itemId]: 'History' }}` draws labels before items;
`dividerStyle="dot"` or `"branch"` selects the joint. Root utility properties
`--sf-font-size`, `--sf-prose-max-h`, `--sf-gutter`, `--sf-gap`, `--sf-disc`, `--sf-badge` and `--sf-badge-face` match Vue.
Glyph intent stays an app-owned `data-sf-intent`; edit `FeedIcon.tsx` to change
icon mapping. Avatars read `media.initials` and `media.color` first, then the
older snapshot `data.initials`/`data.avatar_color`, then the stable identity
hash; a declared colour gets black or white text, whichever contrasts more.
Tombstones remain muted and unlinked.

Metadata follows the headline: date, then unused instrument/origin/result/
location/generator roles in that order. Context appears only in the headline.
Translate lead-in words in `shared/messages.ts`.

Generic bodies are Component, KeyValue, Excerpt, FileAttachment (including
historical File), Prose, ItemList, Image and MediaObject. Activity data and the
object's body/data supply automatic previews; other roles are not previewed.
Published historical `$v` forms still render. Rich Markdown/HTML goes through
the same sanitizer as Vue; plain/verbatim source is escaped.

A row shows a picture only when one of its bodies asks for one. An Image body
draws its own `src` at its declared size when it stores one, else the entity's
media slot it names (`icon`, `preview`, `image`, or a custom `slots.<name>`
read from `media.slots`). One naming the icon slot (`image: "icon"`) draws as
a small thumbnail beside the row's other bodies rather than full width. The thumbnail
links to the object's link (`node.object.link.href`, or `url` before core 0.17) through `FEED_LINK`, with scalar entity attributes
except `href`, event handlers and invalid names. Missing URLs and tombstones
produce unlinked images. An app that registers its own Image renderer through
`FEED_BODIES` draws icon Image bodies in place instead. `FeedProvider` accepts `FEED_MEDIA`, a component
receiving `image`, `href`, `linkAttributes` and `className`, for a host media
renderer such as a lightbox.

`interactive` defaults to true and keeps native `<details>` with its print
rules. Set false for a static feed; `collapsed` sets the initial group state
(null opens static groups). Static collapsed members stay in the HTML with
`hidden print:block`, so print needs no JavaScript.
