# Changelog

## v0.10.1 - 2026-10-29

### Changed

- Allow Storyfeed core 0.22 and 0.23. The kits use nothing that core 0.23 renamed, and the suite passes against core v0.23.0.

## v0.10.0 - 2026-10-14

### Added

- A Laravel Boost guideline and a `storyfeed-ui` skill, in `resources/boost`, so `php artisan boost:install` gives an app's coding agent the kit setup: installing the Blade, Vue or React kit with the Tailwind `@source` lines for a copied kit and for a Vite alias to `vendor`, retuning tokens through `@theme`, the feed props (`image-size`, the viewer, rails and dense child rows), the `FEED_*` provides, and replacing a body renderer with `FeedMedia` so pictures keep their size. A test fails when either file names a component, prop, export, provide key, class or path the package doesn't ship. (#89)
- Code and Callout bodies render in Blade, Vue and React. Code draws escaped source in `<pre><code>` inside Typography's `prose`, with an optional title and a `language-<name>` class for a host highlighter. Callout frames escaped content with an optional title and light/dark palettes for note, info, success, warning and danger; unknown intents draw as note. (#92)
- Headline text can be formatted through a seam in Blade, Vue and React: `app(HeadlineText::class)->register(...)` (`Storyfeed\Ui\Support\HeadlineText`), Vue's `FEED_HEADLINE_TEXT` (`(text: string) => VNodeChild`) and React's `FeedProvider` `headlineText` (`(text: string) => ReactNode`). It draws template text and the pre-rendered `headline` fallback, never entity names, lists, counts or "You"; with nothing set, output is unchanged and text stays escaped. Each kit ships an opt-in `inlineCode` formatter that draws each pair of single backticks as a Tailwind-styled `<code>`, keeps everything else escaped and leaves an unmatched backtick literal; it parses no other Markdown. A custom Blade callback returns trusted HTML and must escape the text itself. Blade delegates count-token exclusion and count-form pluralisation to Storyfeed core 0.21's headline text API, while keeping generated fallback words outside the seam; with an older core its headlines stay plain. (#97)

### Fixed

- Custom Image renderers can pass their body as `payload` to `FeedMedia` (`<x-storyfeed::media>` in Blade) to reuse the feed's image-size limits and the body's own override, including `full`. Media frames shrink to the whole picture without a muted box beyond it, in Blade, Vue and React; fixed icon and sample tiles retain their crop. The README documents this renderer path and the parent `vendor/storyfeed/ui/resources/js` Tailwind scan required when importing a kit through a Vite alias. (#88)

## v0.9.8 - 2026-10-11

### Added

- Pictures can be drawn at a semantic size (ui#83), from core 0.20.7's `Image::make($src)->size('inline')`. The five sizes are `thumbnail`, `inline`, `card`, `feature` and `full`. A whole feed can take a default: `<x-storyfeed::feed image-size="inline">` in Blade, `image-size` on Vue's `FeedStream` and `imageSize` on React's, and a body's own size wins over it. Pictures scale down and keep their shape; they're never cropped. Each size's limits are Tailwind utilities with default lengths, so there's no stylesheet to install. To retune them, set `--sf-image-size-<name>` and `--sf-image-size-<name>-height`, for example in your app's `@theme`. Without a size, a picture is drawn full-width, as before.
- CI fails on any shipped `.css` file, `<style>` block or inline appearance `style` in the kits. Each remaining runtime exception (avatar colours, picture ratios, a body's `maxHeight`) is listed with its reason. `AGENTS.md` sets out the Tailwind mandate for contributors. Actor strips now stack with literal `z-` utilities.

### Changed

- An avatar with a picture shows an empty ring while the picture loads: a transparent disc with a hairline border, in Blade, Vue and React. A row of avatars no longer flashes a strip of brand colours before the pictures arrive. The brand colour and initials still appear when there's no picture or it fails to load, and tombstones stay muted. The colour now travels as the `--sf-avatar-color` custom property, drawn with Tailwind utilities.
- Headlines wrap with `text-wrap: pretty`, so a wrapped headline no longer leaves a word or two alone on its last line.

## v0.9.7 - 2026-10-11

### Changed

- An anonymous actor's "Someone" is drawn as an actor, in Blade, Vue and React: the actor's weight (`font-medium`) and markup (`sf-entity sf-entity--anonymous`), with a muted colour as the cue that nobody is named, and never italic, in single rows and in group headlines. It borrowed the italic, muted placeholder meant for an entity whose label is missing (Vue and React, and Blade's group headlines) or stayed bare headline words (Blade's single rows, #56), so the three kits disagreed. An unlabelled entity's "Something" and any other empty role keep their placeholder look.

### Added

- The page's viewer reads as "You" (ui#75): `<x-storyfeed::feed :viewer="auth()->user()">`, `FEED_VIEWER` in Vue and `FeedProvider`'s `FEED_VIEWER` in React. A headline that names the viewer says "You" at the start of the sentence and "you" anywhere else, in any role and inside lists ("Kim, Ravi and you reviewed Order #9"). The payload is unchanged; only the render knows the reader. "You" is drawn as an actor (`sf-entity sf-entity--viewer`, the actor's weight and colour, unlinked). Present-tense templates need rewording ("You is reading"), and possessives are not handled. Refs #75.
- `npm run test:bare` renders each kit's default output in a bare host, with no variant, no `--sf-*` tokens and no overrides, and fails when that output needs a consumer to add anything to be correct (ui#28). The host holds only what the README asks of an app: Tailwind, Typography and the Laravel starter kit's colour tokens. It runs the alignment, wells and targets checks there, in Blade, Vue and React: the headline's first line centres on the disc, every text-shaped body keeps its measure (never `none`), every row has the default rail, gap and spacing, every card's edge stands off the page in light and dark, and every standalone link has a 24×24 target. The measure, spacing and edge checks also run in the configured workbench. CI runs it. Closes #28.

### Fixed

- A comment in the Vue kit's `FeedIcon` called the default badge 0.75rem; it is 0.875rem.

## v0.9.6 - 2026-10-11

### Fixed

- An Image body that names one of its entity's media slots, as `Image::make($this->feedMediaImage())` does, now takes the slot's alt when it has none of its own, in Blade, Vue and React (ui#70). It drew `alt=""` whatever the picture said. The body's alt still wins, then its caption, then the slot's. Closes #70.

## v0.9.5 - 2026-10-11

### Added

- An actor strip for groups with several actors, in Blade, Vue and React (ui#48). Below the headline, a group draws every actor's face, newest first, including the ones the headline names, as one row of overlapping 24px avatars, each above the one to its right so its ring never covers a face's initials (the row wraps when the text is too large to fit it): eight faces, then a "+N" chip counting the actors not shown, from core's true `distinct.actors`. With eight actors or fewer, all of them show and there's no chip; a group with one actor draws none. The faces come from the group's members, so each one is a member row's face once the group opens. As with the feature strip, the chip opens the group like "Show all N", and expanding hides the strip. It's a separate component from the feature strip (`FeedActorStrip`, `<x-storyfeed::actor-strip>`, built with `actorStrip()` / `ActorStrip::of()`); a group with several actors and varied features draws both, actors first. Closes #48.

## v0.9.4 - 2026-10-11

### Fixed

- A link that stands alone in a body has a 24×24 target, in Blade, Vue and React (ui#29). A MediaObject's subject, files and footnote, an ItemList's items and "more" link, and a Table's link cells measured 14–16px tall: WCAG 2.5.8's inline exception covers a link within a sentence, and none of these is, so they failed AA at the defaults. Each is now an inline-block padded to 24px with a matching negative margin, so the text, the line and every box around it stay where they were (0px at the defaults, and with `--sf-font-size` at 0.875rem and 1.125rem). The only move: stacked file links in a MediaObject sit at least 25px apart (24px plus a pixel for hit-test rounding), so a card with two or more files grows 3px per extra file at the defaults. A call to action is already 32px tall. `npm run test:targets` checks every one in all three kits by hit-testing 12px either side of its centre. Closes #29.

## v0.9.3 - 2026-10-11

### Changed

- Card-shaped bodies draw a lighter well, in Blade, Vue and React (ui#62). MediaObject drew a solid `bg-muted` box with a full-strength `border-border` edge, and Prose, ItemList, Table, KeyValue and CallToAction each drew their own mix of `bg-card` and `border-border`. All six now share one treatment, mixed from your tokens: in light mode a 55% `card` fill the page shows through; in dark mode a 3% `foreground` lift; in both a hairline edge of 8% `foreground`. `--sf-well` and `--sf-well-border`, set on the feed or any element around it, replace the fill and the edge, as `--sf-disc` sizes the disc, so a host tunes them without styling `.sf-media-object`. No blur is drawn behind a card. Excerpt, FileAttachment, Image and verbatim Prose draw no card and are unchanged. Closes #62.

## v0.9.2 - 2026-10-11

### Changed

- Excerpt reads core's v3 body, which is complete by default (storyfeed/storyfeed#152): an Excerpt without `truncated` shows its ellipsis only when it is v2, in Blade, Vue and React. v1 and v3 bodies without the flag read as whole, as core's `Excerpt::upgrade()` reads them. Tagged core writes v2, which draws as before.
- A row draws its featured role's body, in Blade, Vue and React (ui#13). Core's `featured` (storyfeed/storyfeed#76) names the role a row is about: the kits now draw `item[item.featured].body` and that entity's detail forms, where they always drew the object's. With no `featured` field, or `"featured": "object"`, a row draws the object's body as before. `"featured": null` (`withoutFeature()`) draws no entity body; the activity's own body and the meta line still render. A featured role the payload left empty draws no entity body, and the row stays. An Image body naming the icon slot links its thumbnail to the featured entity. A group's strip already read each member's featured role, so its tiles now match the pictures the expanded rows draw.

### Fixed

- A row's headline centres its first line on the rail's disc, in Blade, Vue and React (ui#58). The body's top padding was a fixed `pt-1.5` (`pt-1` on a group's member rows), right for no combination of disc and type size: at the defaults (a 32px disc and a 25.6px line) the headline sat 2.8px low, and 5.3px low with `--sf-disc: 2.5rem` and `--sf-font-size: 0.875rem`. It is now `(disc − 1lh) / 2`, clamped at 0 for a disc smaller than the line, so it follows `--sf-disc` and `--sf-font-size`. A headline that wraps aligns its first line. The badge and the stacked pair are placed against the disc, so they don't move. Closes #58.
- Blade keeps drawing an empty role as bare words, as Vue and React do, once core passes it to `Headline::toHtml()`'s closure (storyfeed/storyfeed#98). It would otherwise have wrapped an anonymous actor's "Someone" in the entity's span.

## v0.9.1 - 2026-10-11

### Fixed

- A MediaObject body draws an image it stores itself, in Blade, Vue and React (ui#53). `MediaObject::make()->image(FeedImage::make()->src(…)->alt(…))` stores `image: {src, alt, width, height}`, and the kits drew only a slot name (`icon`, `preview`, `image`), so the picture silently went missing. That left a composed entry whose object has no media slots no way to show one. It is drawn with its alt (empty allowed) and declared size, at the same size and placement as a slot picture; one with a missing or empty src draws no picture. A slot name draws as before.

## v0.9.0 - 2026-10-10

### Changed

- A group's strip previews only what its expanded members show, in Blade, Vue and React (ui#47). A member whose row draws a picture (its featured entity's Image body) keeps that picture as its tile; every other member gets a quiet name tile: its featured entity's label in small muted text on a light bordered tile, up to three lines, the same size as the other tiles. Erica's three orders now read "Order #2033", "Order #2032" and "Order #2031" instead of three "O2" initials. Initials tiles are gone from the strip, and an entity's declared `media.icon` no longer makes a tile on its own: only an Image body the row draws does. A member with neither a picture nor a label counts in "+N". Groups whose members all feature one entity still draw no strip.
- Expanding a group hides its strip, in Blade, Vue and React (ui#47); collapsing shows it again. The head row doesn't move. Since ui#26 the strip stayed while the members showed below it, so it previewed rows that were already on screen.

### Fixed

- A dateless entry (`published_at: null`, from a composed feed or a source; storyfeed/storyfeed#127) draws no time in Vue and React: no `<time>`, no relative label, no hover title, no day heading, as Blade already did. It neither starts a day nor ends one, so the next dated entry on the same day draws no second heading, now in Blade too, where a dateless entry restarted the day. An app's own time slot or renderer is still called.
- An activity with a null `verb` and no headline leaves the verb out of the fallback sentence in Vue and React ("Someone Order #1001"); it printed "Someone null Order #1001". Vue's fallback also gets back its space before the object ("Someone placed Order #1001", not "placedOrder").

## v0.8.0 - 2026-10-10

### Fixed

- `--sf-gutter`, `--sf-gap`, `--sf-disc`, `--sf-badge` and `--sf-badge-face` set on the feed, a lone row or any element around them now reach the rail, in Blade, Vue and React (ui#36). The feed and every row redeclared them with their own defaults, so a value set higher up never applied: `--sf-gutter: 4rem` on the feed left the rail at 32px. Unset, they still default from `--sf-font-size`.
- Initials and icons scale with `--sf-disc`, `--sf-badge` and `--sf-badge-face`, in Blade, Vue and React (ui#41). They kept a fixed size, so a smaller disc clipped its initials, and a badge, anchored by its bottom-right corner, grew inward over the disc: at `--sf-badge: 1.25rem` it cut the avatar into a crescent. Each glyph is now a fraction of its own circle, and each badge keeps its centre where its default size puts it, so a larger one grows outward from the disc's corner; a pair's badge is 11/14 of `--sf-badge`. At the default sizes nothing moves.

### Changed

- The branch divider is now the default, in Blade, Vue and React (ui#34): day headings (Today, Yesterday, dates) and per-item `dividers` draw as a curve off the rail into the label, the joint storyfeed.dev uses, instead of a dot on the rail. The curve sits on the rail line's own column, 1px wide, and darkens as it leaves the rail: an SVG gradient from the rail's colour (`--color-border`) to the label's (`--color-muted-foreground`), so light, dark and app themes follow. Each divider's gradient has its own id. The line above stops a small, fixed gap before the curve, the line below continues from the curve's end, and the curve meets the label at the middle of its cap height. A `stroke` rule on `.sf-rail__branch` no longer reaches the curve; set those two colour tokens instead. Pass `divider-style="dot"` (Blade, Vue) or `dividerStyle="dot"` (React) for the old look.
- The `dot` divider is a quiet hollow ring, in Blade, Vue and React (ui#43): 0.375em across, a 1px stroke in the rail's colour (`--color-border`), filled with the page background, so it reads as a joint in the line rather than a bullet. Its centre, the gap above and below it, and the label stay where the filled dot had them.

## v0.7.0 - 2026-10-10

### Added

- The group strip reads core's `sample.featured` (storyfeed/storyfeed#93) when a group carries it: one featured entity per sampled member, newest first, with "+N" counted from `distinct.featured`. Without it, each member's own featured entity: the role its `featured` names (storyfeed/storyfeed#76), none when that is null, and the object before core sent the field. In Blade, Vue and React.
- The kits read every page shape core returns (storyfeed/storyfeed#95) as well as the older ones: Blade's `page` takes core 0.13–0.18's `FeedPage`, core main's collection from `get()`, its cursor or simple paginator (the next cursor encoded for the pager), or decoded JSON with the nodes under `data` or `items`; `next-cursor` also takes a `Cursor`. Vue's and React's `FeedStream` take a `page` prop in place of `items` and `nextCursor`, reading the JSON either way, and React exports `readPage()` for an app's own Live refresh.
- An Image body draws its own picture (core 0.18's Image v3, `Image::make('https://…/day-3.jpg')`, stored as `src`) at its declared width and height, in Blade, Vue and React. Without one it draws the entity's slot it names as before, now including custom slots (`Image::make($this->getFeedMedia('sparkline'))`, read from `media.slots.sparkline`). A stored or custom-slot picture also stands for its entity in a group's photograph strip. v1 and v2 rows naming no slot still show the `preview`; a v3 row naming nothing draws nothing, as core reads it. The kits read these payloads themselves, so they draw the same on every supported core.

### Fixed

- A row's body no longer draws larger than its headline when the row sits outside a feed (a Filament panel's 14px base): every row now sets its own size from `--sf-font-size` in Blade, Vue and React, instead of the headline inheriting the host's size while bodies used the kit's absolute `text-base` (ui#23).
- A long headline wraps inside its column on a narrow feed instead of running past the edge, in Blade, Vue and React: a word too long for the line (a file name, a long name in a nested row at 200% text) breaks where it must. Nothing changes where the words fit, and apps no longer need their own `overflow-wrap` rule.

### Changed

- One type scale for rows, in Blade, Vue and React (ui#23): the headline at 1em of `--sf-font-size`; the meta line, body content, body labels (muted) and body titles (semibold) at 0.875em; footnotes, captions and file kinds and sizes at 0.75em. Bodies used to draw at the headline's size. Headings inside rich Prose never exceed the body text (semibold `h1`/`h2`, medium below), and tables inside it draw at body size. KeyValue rows share one key column, at most 40% of the card, with muted keys and values on one left edge; on a narrow card each key sits over its value. Verbatim Prose is a dark block with light text in every theme, from the new `--sf-code-bg` and `--sf-code-fg`; inline and fenced code in rich Prose draw on the muted colour.
- One group strip, in Blade, Vue and React (ui#27): a tile for each member activity, newest first, showing what that activity features: its picture (an Image body, else its icon), else that entity's avatar, its initials on its colour, so a member never leaves a blank. Every tile is the same rounded square, spaced and linked to its entity; a deleted entity is a muted, unlinked tile. Up to four tiles, or three and a "+N" tile counting the members not shown. The "+N" tile is a button that opens and closes the group exactly like "Show all N" (named "Show all N", with `aria-expanded` and `aria-controls`; in Blade it toggles the native `<details>` with a one-line inline handler). A strip of identical tiles is skipped. The strip used to sample only the objects' photographs, three at most, and fell back to a row of declared avatars; it now reads the group's members. Where a member's featured entity comes from is one function (`featuredOf()` / `Strip::featured()`), the object until core sends `sample.featured`.
- Expanding a group adds its members and takes nothing away, in Blade, Vue and React: the strip stays under the headline while the members show, as do the rail's faces, so the head row doesn't move when a group opens or closes. Before, opening a group hid the strip and the avatar row.
- Several actors in a group's rail draw as a diagonal pair inside one disc's square, in Blade, Vue and React (ui#25): the first actor in front at the bottom-right, carrying the verb badge it has on a single-actor row, and the second behind at the top-left, each 2/3 of `--sf-disc` with one-letter initials and a 2px ring in the page colour. Picked by Jasper: the verb badge on a pair is smaller (11/32 of the disc, 11px at the default size) to balance the smaller faces, and sits exactly where a single actor's does. The pair is never taller than one face, so the rail line starts where it does under one face, and it scales with `--sf-font-size`. Below a 1.5rem (24px) disc only the front face shows. At most two faces; the count stays in the headline. Before, a three-person stack stood nearly three faces tall and lost its badge. A face badge (`rail="activity"`) still never stands for several actors.
- Rows no longer show the object's icon automatically; add `Image::make($this->feedMediaIcon())` (core 0.18; `Image::make()->withIcon()` before it) to the rows that should. An Image body naming the icon slot (`image: "icon"`) draws as the small thumbnail beside the row's other bodies, linked to the object, in Blade, Vue and React; Image bodies naming `preview` or `image` keep their size. The kit never adds a picture the payload didn't ask for. The `objectIcon` renderer and `object-icon` prop (Blade) and the `objectIcon` prop (Vue and React) that drew it are removed.

### Removed

- The avatar row (`avatar-row` in Blade, `FeedAvatarRow` in Vue and React, `AvatarRow` and `shared/avatarRow.ts`): its entities now draw as tiles in the group strip, built with `Strip::of()` or `strip()`.

## v0.6.0 - 2026-10-09

### Added

- A body's maximum height (core 0.17's `FeedBody::maxHeight()`, read from `$meta.maxHeight`; other `$meta` keys are ignored) is honoured on every body type in Blade, Vue and React: a CSS length caps the whole body, which scrolls inside its wrapper, and `none` draws it in full. Only `none` or a CSS length is read.
- The kits read core 0.17's links (storyfeed/storyfeed#79) as well as core 0.16's: an entity's one `link` (`{href, modal, attributes}`) in place of `url`, `modal` and `attributes`, and body links with `modal` and `attributes`. A body link without an `href` goes to its entity's own link and adds its `modal` and `attributes` to the entity's; `modal` reaches the host `FEED_LINK` in Vue and React. Link attributes are filtered the same way everywhere (no `href`, no event handlers), including on headline entity links, which used to forward them unfiltered.
- The `CallToAction` body (`Storyfeed/Body/CallToAction`, core 0.17) draws in Blade, Vue and React: an optional heading and text in a card, then its one action as a button, or the button alone. Vue and React pass a `modal` link's `modal` to the host `FEED_LINK` (Inertia's `Link`); Blade draws a plain link. Link attributes are filtered as elsewhere, and an action without an `href` goes to the body's own entity, read from core 0.17's `link.href` as well as `url`.
- An activity's time range (`starts_at` / `ends_at`, core 0.17's `->startsAt()` and `->endsAt()`) draws on the meta line after the time in Blade, Vue and React: "30 Sep – 9 Oct 2026", collapsed within a month ("1 – 9 Oct 2026") or a day ("9 Oct 2026"), and "from 9 Oct 2026" / "until 31 Oct 2026" when one end is open. Blade reads it in the feed's `timezone`; React reads it in UTC until the page hydrates.
- The `Table` body (`Storyfeed/Body/Table`, core 0.17) draws in Blade, Vue and React as a standard `<table>` inside Typography's `prose`: header row, body rows, and footer rows in a `<tfoot>` for subtotals and totals. Cells are escaped plain text that keeps its line breaks, numbers, links, or an empty mark (—). Core's slim payload (no `title`, `headers` or `footer`) and ragged rows read as `Table::upgrade()` reads them.
- Vue and React draw app body types. Register a renderer by its exact type: `app.use(feedBodies({ 'Acme/Shipment': Shipment }))` or `provide(FEED_BODIES, …)` in Vue, `<FeedProvider FEED_BODIES={{ 'Acme/Shipment': Shipment }}>` in React. Renderers receive the built-in bodies' props, a renderer for a core type replaces the kit's, and a type with no renderer still draws nothing. The README's "Custom body types" covers all three kits.
- A group draws its sampled objects as a row of their avatars when they have no photographs ("Ana added Ben, Cara and 2 others to Kitchen remodel"), in Blade, Vue and React. Only declared avatars count (`media.icon`, or `media.initials` with `media.color`); each links to its entity, and "+N" counts the objects not sampled. The row never shows the actor, and is skipped with fewer than two avatars or when every avatar is the same picture. The Blade kit adds an `avatar-row` component and the React kit exports `FeedAvatarRow`.
- A body whose type has no renderer draws its `$fallback` line, as one muted line of escaped text, in Blade, Vue and React. A registered renderer or view always wins, and a body without a fallback still draws nothing.

### Fixed

- A MediaObject card's picture keeps its shape instead of a 4rem square crop, so Open Graph link images (about 1.91:1) show whole in Blade, Vue and React. A declared `width` and `height` set the ratio, clamped between 1:1 and 2:1, at the card's 4rem height; a picture without them shows whole at 6rem wide, up to 8rem tall; the `icon` slot stays square. The text column keeps at least 12em, so on a narrow card the picture stacks above it.
- Excerpt reads core's slim v2 payload, where `truncated` is written only when false: an Excerpt without the flag shows its ellipsis in Blade, Vue and React, as core's `Excerpt::upgrade()` reads it. v1 bodies without the flag still read as whole.

### Changed

- Requires `storyfeed/storyfeed` `^0.13 || ^0.14 || ^0.15 || ^0.16 || ^0.17`, so the kits install alongside core v0.17.
- Long Prose bodies now show in full; only code and verbatim blocks scroll inside their box. Rich and plain Prose and Table bodies are no longer capped at 24rem; `pre` blocks inside rich Prose and verbatim Prose still are, at `--sf-prose-max-h` (default `24rem`), a CSS variable an app can change.
- A group's photograph strip reads only its objects, never its actors or other roles, in Blade, Vue and React, so a group no longer pulls an actor's photo into the strip.
- The kits require the Tailwind Typography plugin. Rich `Prose` (Markdown and HTML) and `ItemList` render inside Typography's `prose` in Blade, Vue and React, replacing the kits' hand-rolled list, table, quotation and heading styles. Install `@tailwindcss/typography` and add `@plugin "@tailwindcss/typography";` beside the kit's `@source` line. The `prose` colours come from the starter-kit tokens, so dark mode follows them, and its size is inherited from the feed, so `--sf-font-size` and the browser's text size scale its tables, lists and headings with the rest of the feed.

## v0.5.0 - 2026-10-09

### Changed

- Requires `storyfeed/storyfeed` `^0.13 || ^0.14 || ^0.15 || ^0.16`, so the kits install alongside core v0.16.
- Prose Markdown renders as GitHub-flavoured Markdown in Blade, Vue and React: tables, strikethrough, autolinks and read-only task lists. The Vue and React kits render it with `micromark` and its GFM extensions instead of `markdown-it`; install `micromark`, `micromark-extension-gfm-autolink-literal`, `micromark-extension-gfm-strikethrough`, `micromark-extension-gfm-table` and `micromark-extension-gfm-task-list-item`, and remove `markdown-it`.
- The rich-text sanitizer keeps task-list checkboxes (`input[type=checkbox][disabled]`, with `checked`) on both the Markdown and HTML paths, so `Prose::html(Str::markdown("- [x] …"))` keeps its completion state. No other input passes.
- Feeds render larger by default: body text is `1rem` (was 13.5px), metadata and captions `0.875rem`. Text, spacing, avatars, badges and the rail are sized on Tailwind's rem scale in Blade, Vue and React, so a feed follows the reader's browser text size and scales as one unit.
- The group toggle is at least 24px tall (WCAG 2.2 target size).

### Added

- `--sf-font-size` sets the feed's size: `class="[--sf-font-size:0.875rem]"` on the feed root draws a compact feed.
- Avatars read core's `media.initials` and `media.color` (`FeedMedia::make()->initials('AC')->color('#438d98')`): the icon, else the declared initials on a disc of the declared colour, else the derived default. A declared colour gets black or white initials, whichever contrasts more. `data.initials` and `data.avatar_color` still apply when `media` declares neither; that fallback is removed in the next release.

## v0.4.5 - 2026-10-09

### Changed

- Requires `storyfeed/storyfeed` `^0.13 || ^0.14 || ^0.15`, so the kits install alongside core v0.15.

## v0.4.4 - 2026-10-08

### Fixed

- Footnote-only media objects render as a plain link or text line in Blade, Vue and React.

## v0.4.3 - 2026-10-08

### Fixed

- Key-value rows stack values below their labels in narrow cards in Blade, Vue and React.

## v0.4.2 - 2026-10-08

### Fixed

- Key-value labels retain their width and wrapped values read left-aligned in Blade, Vue and React.

## v0.4.1 - 2026-10-08

### Changed

- Requires `storyfeed/storyfeed` `^0.13 || ^0.14`, so the kits install alongside core v0.14.

### Fixed

- Up to three actor avatars start at the single-avatar rail position and overlap
  downward by 12px along the rail in Blade, Vue and React, with aligned headlines
  and the line continuing below the last face. The first-named actor stays on
  top, with each lower face tucked behind the one above it.

## v0.4.0 - 2026-10-08

Requires `storyfeed/storyfeed` `^0.13 || 0.13.x-dev`.

### Added

- React 19 kit with a shared, framework-free TypeScript core, Tailwind v4
  starter-kit tokens, provider/render-prop seams, native disclosure and
  SSR-safe clocks.
- `php artisan storyfeed:ui vue|react` copies a kit and its shared core into
  your app. Both installers preserve differing files, report unchanged files,
  print unified diffs with `--diff` and replace differing files with `--force`.
- Tailwind Vue and Blade kits share actor/activity rails, snapshot-coloured
  avatars, stacked group faces, dot/branch dividers and sampled media strips.
- Raw payload `items`/`nextCursor` input alongside `FeedPage`, independent
  interactive/collapsed group state, body/time/annotation slots and trusted
  application rendering hooks. Blade Component bodies use an allowlisted registry.
- React SSR, installed-kit imports, cross-timezone hydration, strict TypeScript
  and exact-zero Vue/Blade/React geometry checks in CI. Shared fixtures cover
  1512 and 500 pixels, light/dark and collapsed/expanded states.

### Changed

- Vue uses the shared TypeScript core, body discovery and rich-text sanitizer.
  Both installers include self-contained shared files within the destination.
- Blade body geometry and tokens match Vue, including list markers, facts,
  cards, wrapped verbatim code, quotations and compact file metadata. The
  Typography plugin is no longer required; the README supplies starter-kit tokens.
- Activity and group timestamps sit beneath the headline with translated,
  linked leftover roles. Roles used in the headline are omitted. Context stays
  out of the meta line and can still appear in headline templates.
- Timestamp labels use relative time today, yesterday with time, weekday/date
  this year and the full date in older years. Absolute hover titles include
  weekday and seconds in the display timezone.
- PHP CI covers the core release constraint and core main.

### Removed

- Summary rendering from Blade, Vue, React and shared payload types. Groups use
  their own headline/template and no longer require phrases or period fields.
  Unknown extra payload keys are ignored.

### Fixed

- Object icons retain entity links and allowed scalar link attributes, and use
  the app's media renderer. Missing URLs and tombstones leave icons unlinked.
- Collapsed static group members remain available when printing. Interactive
  groups retain native disclosure print behavior.
- Body discovery handles activity/object data and the object's body slot,
  including historical File, KeyValue and MediaObject payloads. Empty renderers
  leave no wrapper. Blade's sanitized HTML allowlist matches Vue.
- Vue divider rail selectors compile correctly in Tailwind. Relative labels
  follow the shared minute/hour rounding and use `just now` below 45 seconds.
- File bodies no longer repeat an owning entity's name or URL.

## v0.3.0 — Pictures only when a body asks (2026-10-01)

Requires `storyfeed/storyfeed` `^0.12.0`.

### Added

- **The Image body.** `Storyfeed/Body/Image` draws the picture its body names
  from the entity's media, with alt text (falling back to the caption) and the
  caption as a `figcaption`. An empty slot draws nothing.

### Changed

- **No automatic object picture.** An activity no longer paints its object's
  preview above the bodies, and never treats the entity URL as a picture. A
  picture appears only when an Image or MediaObject body asks for it. The
  actor/icon badge is unchanged.
- **Group samples** come from members' Image bodies; a member without one adds
  no picture.

### Removed

- **The built-in thread component**, alongside core's `FeedThread` removal. Use
  `Excerpt` for quoted words, or register an application body renderer for
  discussion content. Historical thread data is no longer drawn automatically.

## v0.2.0 — The Blade kit (2026-09-30)

This package is now the renderers. The data forms it shipped in v0.1.1 are
core's body types, and it draws them.

### Added

- **The Blade kit.** `<x-storyfeed::feed :page="$page" />` renders a page of
  the feed the way Laravel's pagination views render a paginator: activities,
  groups and their members, the digest, deleted models, quotes, every core
  body type, a missing actor, the pager and an empty page. The views are
  anonymous components under the `storyfeed` namespace; publish them with
  `php artisan vendor:publish --tag=storyfeed-views` to restyle them.
- **Styled with Tailwind CSS v4**, with dark variants and the Typography
  plugin. Register the views and the plugin in your application's CSS and
  compile it with your own build:

  ```css
  @source "../../vendor/storyfeed/ui/resources/views";
  @plugin "@tailwindcss/typography";
  ```

  Stable hooks for your own styles are `data-sf-intent`, `data-sf-glyph`,
  `data-storyfeed-body` and `data-storyfeed-summary`.
- Body renderers for `Excerpt`, `FileAttachment`, `ItemList`, `KeyValue`,
  `MediaObject` and `Prose`. An app draws its own body type (`Acme/Attachment`)
  by adding `resources/views/vendor/storyfeed/components/body/acme/attachment.blade.php`; an
  unknown body type draws nothing rather than failing.
- Prose and Excerpt render Markdown with raw HTML and unsafe links disabled,
  and sanitize HTML at render time. Plain text and verbatim source stay
  escaped. `league/commonmark` and `symfony/html-sanitizer` are now
  dependencies.
- Stored `Storyfeed/Body/File` bodies draw as `FileAttachment`, and stored
  KeyValue v1 and MediaObject v1 bodies are upgraded at read time.

### Changed

- Requires `storyfeed/storyfeed` `^0.11.0` rather than `dev-main`.

### Removed

- **`Storyfeed\Ui\Data\*` moved to core.** Use the body types in
  `storyfeed/storyfeed`:

  | v0.1.1 | v0.2.0 |
  |---|---|
  | `Storyfeed\Ui\Data\Markdown` | `Storyfeed\Body\Prose` (`Prose::markdown()`) |
  | `Storyfeed\Ui\Data\Fields` | `Storyfeed\Body\KeyValue` |
  | `Storyfeed\Ui\Data\Excerpt` | `Storyfeed\Body\Excerpt` |
  | `Storyfeed\Ui\Data\File` | `Storyfeed\Body\FileAttachment` |
  | `Storyfeed\Ui\Data\MediaObject` | `Storyfeed\Body\MediaObject` |
  | `Storyfeed\Ui\Data\Change` | none: record a before and after in the activity's `data` and say it in a dynamic headline |

  A body goes in core's `body` slot rather than at a key you chose in the
  activity's `data` (core's v0.11.0 changelog has the migration that adds the
  column), and it stamps itself `$body` (was `$detail`) with a `Storyfeed/Body/<Type>` name
  (was `Storyfeed/<Form>`). Rows stored with the v0.1.1 forms are not drawn;
  re-record them, or rewrite them in a migration of your own.

## v0.1.1

- Data forms for activity feeds: `Markdown`, `Change`, `Fields`, `Excerpt`,
  `File` and `MediaObject` under `Storyfeed\Ui\Data`.
