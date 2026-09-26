# Storyfeed UI — renderers for activity feeds

[![GitHub Tests Action Status](https://github.com/storyfeed/ui/actions/workflows/run-tests.yml/badge.svg)](https://github.com/storyfeed/ui/actions/workflows/run-tests.yml)

Storyfeed UI is a free, MIT-licensed set of renderers for
[Storyfeed](https://github.com/storyfeed/storyfeed) activity feeds: components
that take a page of the feed and draw it. Blade first, then Vue/Inertia, with
Livewire and React following.

It works the way Laravel's pagination does. Core hands you the data, a
`FeedPage` whose items read as `Storyfeed\Support\FeedItem`, and this package
renders it with default Blade views you can publish and restyle.

> **The detail forms moved to core on 2026-09-14.** `Markdown`, `Change`,
> `Fields`, `Excerpt`, `File` and `MediaObject` are
> `Storyfeed\Detail\*` in `storyfeed/storyfeed`, and their storage names gained
> a segment: `Storyfeed/Detail/Change`. Their names always said `Storyfeed/`
> rather than `storyfeed-ui/`, because a detail's name must not contain the
> library that defined it — so the vocabulary was core's while the classes were
> not. This package is the renderers.

> **Early development.** This package currently depends on Storyfeed's `dev-main`
> branch. Its API can change without a deprecation cycle. Commit your application's
> Composer lockfile to keep installations reproducible.

## Installation

Requires PHP 8.4 or later in the PHP 8 series. The current test harness uses
Laravel 12; CI runs PHP 8.4 and 8.5 on Ubuntu and Windows with lowest and stable
dependencies.

```bash
composer require storyfeed/ui
```

The service provider registers itself through package discovery.

## Usage

Pass a page of the feed to a view:

```php
use Illuminate\Http\Request;
use Storyfeed\Facades\Storyfeed;

Route::get('/', fn (Request $request) => view('feed', [
    'page' => Storyfeed::feed()->cursor($request->query('cursor'))->get(),
]));
```

Draw it with one tag, and put the default stylesheet in your layout's head:

```blade
<head>
    @storyfeedStyles
</head>

<x-storyfeed::feed :page="$page" />
```

Attributes on the tag, such as `class`, land on the feed's root element. The
`empty` slot replaces the words shown for an empty page:

```blade
<x-storyfeed::feed :page="$page">
    <x-slot:empty>Nothing has happened yet.</x-slot:empty>
</x-storyfeed::feed>
```

### Components

`<x-storyfeed::feed>` is built from smaller anonymous components, and each one
can be used on its own:

| Component | Draws |
|---|---|
| `<x-storyfeed::feed :page>` | the page, then a link to older activity |
| `<x-storyfeed::item :item>` | one item: an activity, a group or a digest row |
| `<x-storyfeed::activity :activity>` | an activity row |
| `<x-storyfeed::group :group>` | a group row, its members behind a disclosure |
| `<x-storyfeed::digest :digest>` | a digest row: a person's day, or a crowd |
| `<x-storyfeed::headline :headline>` | a headline, each entity linked |
| `<x-storyfeed::glyph :glyph :intent>` | the icon disc |
| `<x-storyfeed::time :at>` | when it happened |
| `<x-storyfeed::thread :thread>` | what an activity quotes |
| `<x-storyfeed::media :image>` | a picture |
| `<x-storyfeed::body :body>` | one body, by its type |
| `<x-storyfeed::pager :cursor>` | the link to the next page |

Each of core's body types has a component in `components/body`: `key-value`,
`excerpt`, `prose`, `change`, `file`, `item-list` and `media-object`. A body
type with no component draws nothing.

### Styling

`@storyfeedStyles` inlines the kit's stylesheet, as `@livewireStyles` does.
It needs no build step and no Tailwind. The markup carries stable `sf-*`
classes, and the colours are CSS custom properties you set on an ancestor:

```css
.sf-feed {
    --sf-text-color: #111827;
    --sf-muted-color: #4b5563;
    --sf-faint-color: #9ca3af;
    --sf-line-color: #e5e7eb;
    --sf-hover-color: #f9fafb;
    --sf-ring-color: #ffffff;
}
```

A glyph's intent is your app's own word and lands on `data-sf-intent`, so
colour it in your own CSS: `.sf-icon[data-sf-intent='shipped'] { … }`.

To serve or bundle the stylesheet instead of inlining it, publish it to
`public/vendor/storyfeed/storyfeed.css`:

```bash
php artisan vendor:publish --tag=storyfeed-assets
```

## Customising the Views

Publish the views to change the markup:

```bash
php artisan vendor:publish --tag=storyfeed-views
```

They land in `resources/views/vendor/storyfeed`, and a view there replaces
the package's. You only need to keep the files you change.

**Icons.** The payload's glyph is a token, such as `shopping-bag`, and the kit
ships no icon set. Draw a token by adding
`resources/views/vendor/storyfeed/icons/shopping-bag.blade.php`. A token with
no view draws `icons/activity`.

**Your own body types.** A body type draws the component named after it:
`Acme/Attachment` draws
`resources/views/vendor/storyfeed/components/body/acme/attachment.blade.php`,
which receives the body as `$body` and its entity as `$entity`.

**Words.** Headline words such as "Someone" and "a removed order" are core's
translation lines (`php artisan vendor:publish --tag=storyfeed-translations`).
The kit's own words, such as "Older activity" and "Show all :count", are plain
`__()` strings: translate them in your `lang/{locale}.json`.
## Licence

MIT. See [LICENSE.md](LICENSE.md).
