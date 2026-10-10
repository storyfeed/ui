# Storyfeed Vue kit

Vue 3, TypeScript and Tailwind v4. Copied files belong to the app. Import
`FeedStream.vue` and pass core's page JSON as `page` (nodes under `data` from
storyfeed/storyfeed#95, under `items` before it), or `items` and
`next-cursor` yourself; handle `@load-more` for pagination. No kit CSS is required.
Install its dependencies:

```bash
npm install lucide-vue-next micromark micromark-extension-gfm-autolink-literal micromark-extension-gfm-strikethrough micromark-extension-gfm-table micromark-extension-gfm-task-list-item sanitize-html
npm install -D @tailwindcss/typography
```

Rich `Prose`, `ItemList` and `Table` render inside Typography's `prose`, so register the
plugin in `resources/css/app.css`:

```css
@plugin "@tailwindcss/typography";
```

The copy command includes the framework-free core in a self-contained `shared/` directory.

Use the Laravel Vue starter-kit tokens: `background`, `foreground`, `card`,
`muted`, `muted-foreground`, `primary`, `primary-foreground`, `border` and `ring`.
Define these tokens in a non-starter-kit app. Theme colours come from tokens.
Avatars are content: an entity's `media.icon` wins, then its declared
`media.initials` on a disc of `media.color`; the older `entity.data.initials`
and `entity.data.avatar_color` still apply when `media` declares neither, until
the next release. Otherwise the source palette and stable `type:id` hash
distinguish identities. A declared colour gets black or white text, whichever
contrasts more; other live avatars keep white text. Tombstones use `bg-muted` and never apply their
former colour or icon. Primary tokens are a fallback if no colour is derived.
Glyph intent is preserved as `data-sf-intent`, with no built-in intent vocabulary
or colour map. Edit `FeedIcon.vue` to map your app's intents to token utilities.
Verbatim code has a `dark:` override because foreground/background tokens
invert and code needs a dark surface in both themes.

## Seams

- Provide `FEED_LINK` from `keys.ts` with Inertia's `Link` (or any Vue component
  accepting `href`) to replace anchors. Entity attributes are forwarded, and a
  CallToAction whose link is `modal` passes `modal` to it.
- Provide `FEED_NOW` with a millisecond timestamp for deterministic SSR/static
  rendering. Otherwise the calendar ladder updates after mount. Dates keep
  machine-readable datetimes, absolute hover titles and the `#time` slot.
- Install `feedBodies({ 'Acme/Shipment': Shipment })` from `body/index.ts` with
  `app.use()`, or provide `FEED_BODIES` from `keys.ts`, to draw app body types
  by their exact type. Each install merges. A renderer receives `payload`,
  `entityLabel`, `entityUrl` and `entityMedia`; one registered for a core type
  replaces the kit's. A type with no renderer draws its `$fallback` line as
  muted plain text, or nothing without one.
- Provide `FEED_COMPONENTS` with an app-owned map of exact body names to Vue
  components. A `Storyfeed/Body/Component` body's `props` are forwarded. Unknown
  names render nothing. The docs' `Note` and `Orders/Progress` demos are excluded:
  they are consumer-specific body-slot examples, not generic body forms.
- Provide `FEED_FILE_LABELLER` with a function receiving `{ name, mediaType }`
  and returning a label or null. A host label wins; null uses `fileLabels.ts`'s
  MIME map (PDF, CSV, Word, images, etc.), then the supplied MIME string.
  Filename extensions are never inferred by the kit. File names always show,
  even when the headline names the entity; sizes use decimal units (21 MB,
  76 KB). The payload is unchanged.
- `MediaObject.vue` accepts `image-placement="beside|below"`. Beside is the
  compact picture beside the text, which keeps its shape: an `icon` is a 4rem square;
  a picture with a declared `width` and `height` is 4rem tall at its own ratio, clamped between 1:1 and 2:1 (cropped only beyond that); one without shows whole at 6rem wide, up to 8rem tall. On a narrow card the picture stacks above the text.
  Below draws the photograph after the prose at its normal
  media width. Provide `FEED_MEDIA_OBJECT_PLACEMENT` with `'below'` to apply
  that posture to automatic body rendering throughout a feed; a prop wins.
- `#body`, `#annotations` and `#time` receive the node on both activities and
  groups, including expanded children. Generic body forms are rendered from the
  activity's data and the object's body/data; other roles are not previewed.

## Rails and dividers

`rail` takes `actor`, `activity`, `actor-only` or `activity-only`, or the
structured `Rail` type in `rail.ts`. Dense children suppress the secondary badge.
Use `rail="actor"` for an actor avatar with an activity badge. With that
parent posture, dense children retain actor discs; pass
`child-rail="activity-only"` on `FeedStream`, `FeedNode` or `FeedGroup` for
independent glyph-only members. An omitted child rail inherits the parent.
Group avatar samples never imply that one actor represents many.

Groups consume core's explicit pinned singular slots; distinct=1 alone does
not pin a role. Groups read their own headline/template; Summary rendering
has been removed, mirroring core. Unknown extra payload keys are ignored.
Below the headline, a group draws a strip: one tile per member activity, newest first, each the
thumbnail of what that activity features: its picture (an Image body, else
its icon), else that entity's avatar, its initials on its colour. Every tile
is the same rounded square, spaced, never overlapped, and links to its entity;
a deleted entity is a muted, unlinked tile. Up to four tiles; past that, three
and a "+N" tile counting the members not shown. On a group that can open, the "+N" tile opens and
closes it like "Show all N". A strip of identical tiles is
skipped. It stays in place when the group expands.

`grouped=false` hides day headings. `dividers` maps item IDs to labels to render
before those items. Dividers branch off the rail by default, a curve into the
label; `divider-style="dot"` draws a dot on the rail instead. `isLast` suppresses the
trailing rail; a next cursor keeps it connected to the pager.

`--sf-font-size` (default `1rem`) scales the whole feed, and every row sizes
from it, never from the host page: headline 1em, meta and bodies 0.875em,
footnotes and captions 0.75em (see the root README's type scale). Verbatim
Prose uses `--sf-code-bg`/`--sf-code-fg`. Flowing text is never
capped; code and verbatim blocks scroll past `--sf-prose-max-h` (default `24rem`),
and a body's own `$meta.maxHeight` overrides either; see the root README.
The root's Tailwind arbitrary properties also expose `--sf-gutter`, `--sf-gap`,
`--sf-disc`, `--sf-badge` and `--sf-badge-face`. Override on the `FeedStream`
element, for example `style="--sf-gutter: 2.5rem"`. The primary avatar/icon
size follows `--sf-disc`; stacked faces share that size and overlap downward
along the rail, keeping the headline aligned with single-actor rows.
The `sf-*` classes remain semantic hooks; styling lives in utilities.

Metadata follows the headline: date, then unused instrument/origin/result/
location/generator roles. Context appears only when named by the headline.
Lead-in words live in `messages.ts`; time uses local calendar boundaries.

Generic bodies include KeyValue, Excerpt, FileAttachment (plus legacy File),
Prose, ItemList, Image and MediaObject. Rich Markdown/HTML is sanitized;
verbatim and plain text are escaped and preserve whitespace. Published
historical `$v` forms continue to render.

A row shows a picture only when one of its bodies asks for one. An Image body
draws its own `src` at its declared size when it stores one, else the entity's
media slot it names (`icon`, `preview`, `image`, or a custom `slots.<name>`
read from `media.slots`). One naming the icon slot (`image: "icon"`) draws as
a small thumbnail beside the row's other bodies rather than full width. The thumbnail links to the object's link
(`node.object.link.href`, or `url` before core 0.17) through `FEED_LINK` and forwards scalar entity attributes,
excluding `href`, event handlers and invalid names. A missing URL or tombstone
renders an unlinked image. An app that registers its own Image renderer through
`FEED_BODIES` draws icon Image bodies in place instead. Provide `FEED_MEDIA` with a component receiving
`image`, `href`, `linkAttributes` and the kit classes to render media yourself
(for example, a lightbox button).

`interactive` defaults to true. Set it false for a static feed; `collapsed`
selects its initial group state (null opens static groups). Collapsed members
stay in the HTML with `hidden print:block`, so print needs no JavaScript.
