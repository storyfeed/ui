# Changelog

## Unreleased

### Changed

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
