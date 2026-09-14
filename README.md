# Storyfeed UI — renderers for activity feeds

[![GitHub Tests Action Status](https://github.com/storyfeed/ui/actions/workflows/run-tests.yml/badge.svg)](https://github.com/storyfeed/ui/actions/workflows/run-tests.yml)

Storyfeed UI is a free, MIT-licensed set of renderers for
[Storyfeed](https://github.com/storyfeed/storyfeed) activity feeds: components
that take a payload node and draw it. Vue/Inertia first, then Blade, with
Livewire and React following.

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

## Licence

MIT. See [LICENSE.md](LICENSE.md).
