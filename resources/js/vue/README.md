# Storyfeed Vue kit

Vue 3, TypeScript and Tailwind v4. Copied files belong to the app. Import
`FeedStream.vue` and pass core's serialized `items` directly; pass
`next-cursor` and handle `@load-more` for pagination. No kit CSS is required.
Install `lucide-vue-next`, `markdown-it` and `sanitize-html`.

Use the Laravel Vue starter-kit tokens: `background`, `foreground`, `card`,
`muted`, `muted-foreground`, `primary`, `primary-foreground`, `border` and `ring`.
Define these tokens in a non-starter-kit app. Theme colours come from tokens.
Avatar colours are content: `entity.data.avatar_color` wins when supplied;
otherwise the source palette and stable `type:id` hash distinguish identities.
Live avatars retain white text. Tombstones use `bg-muted` and never apply their
former colour or icon. Primary tokens are a fallback if no colour is derived.
Glyph intent is preserved as `data-sf-intent`, with no built-in intent vocabulary
or colour map. Edit `FeedIcon.vue` to map your app's intents to token utilities.
Verbatim code has a `dark:` override because foreground/background tokens
invert and code needs a dark surface in both themes.

## Seams

- Provide `FEED_LINK` from `keys.ts` with Inertia's `Link` (or any Vue component
  accepting `href`) to replace anchors. Entity attributes are forwarded.
- Provide `FEED_NOW` with a millisecond timestamp for deterministic SSR/static
  rendering. Otherwise the calendar ladder updates after mount. Dates keep
  machine-readable datetimes, absolute hover titles and the `#time` slot.
- Provide `FEED_COMPONENTS` with an app-owned map of exact body names to Vue
  components. A `Storyfeed/Body/Component` body's `props` are forwarded. Unknown
  names render nothing. The docs' `Note` and `Orders/Progress` demos are excluded:
  they are consumer-specific body-slot examples, not generic body forms.
- `#body`, `#annotations` and `#time` receive the node on both activities and
  groups, including expanded children. Generic body forms are rendered from the
  activity's data and the object's body/data; other roles are not previewed.

## Rails and dividers

`rail` takes `actor`, `activity`, `actor-only` or `activity-only`, or the
structured `Rail` type in `rail.ts`. Dense children suppress the secondary badge.
Group avatar samples never imply that one actor represents many.

`grouped=false` hides day headings. `dividers` maps item IDs to labels to render
before those items. `divider-style="dot"` is the default;
`divider-style="branch"` draws a curve off the rail. `isLast` suppresses the
trailing rail; a next cursor keeps it connected to the pager.

The root's Tailwind arbitrary properties expose `--sf-gutter`, `--sf-gap`,
`--sf-disc`, `--sf-badge` and `--sf-badge-face`. Override on the `FeedStream`
element, for example `style="--sf-gutter: 2.5rem"`. The primary avatar/icon
size follows `--sf-disc`; stacked small faces retain their compact size.
The `sf-*` classes remain semantic hooks; styling lives in utilities.

Metadata follows the headline: date, then unused instrument/origin/result/
location/generator roles. Context appears only when named by the headline.
Lead-in words live in `messages.ts`; time uses local calendar boundaries.

Generic bodies include KeyValue, Excerpt, FileAttachment (plus legacy File),
Prose, ItemList, Image and MediaObject. Rich Markdown/HTML is sanitized;
verbatim and plain text are escaped and preserve whitespace. Published
historical `$v` forms continue to render.
