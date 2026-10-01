# Changelog

## Unreleased

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
