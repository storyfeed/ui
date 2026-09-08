# Storyfeed UI — Details for activity feeds

[![GitHub Tests Action Status](https://github.com/storyfeed/ui/actions/workflows/run-tests.yml/badge.svg)](https://github.com/storyfeed/ui/actions/workflows/run-tests.yml)

Storyfeed UI is a free, MIT-licensed library of conventional data forms for
[Storyfeed](https://github.com/storyfeed/storyfeed) activity feeds. It currently
ships one detail: `Storyfeed\Ui\Data\Markdown`, for authored Markdown source.

A Vue/Inertia kit is planned. There are no Vue components or Blade views in this
package yet; drawing a detail belongs to the renderer consuming it.

> **Early development.** This package currently depends on Storyfeed's `dev-main`
> branch. Its API can change without a deprecation cycle. Commit your application's
> Composer lockfile to keep installations reproducible.

## Installation

Requires PHP 8.4 or later in the PHP 8 series. The current test harness uses
Laravel 12; CI runs PHP 8.4 and 8.5 on Ubuntu and Windows with lowest and stable
dependencies. Storyfeed itself remains on `dev-main` in both dependency lanes.

The package is public on GitHub but is not currently available from Packagist.
Register its public repository in your application's Composer configuration,
then explicitly allow both development branches:

```bash
composer config repositories.storyfeed-ui vcs https://github.com/storyfeed/ui
composer require storyfeed/ui:dev-main storyfeed/storyfeed:dev-main
```

## What is a detail?

An activity's `data` map belongs to your app. A detail puts one value in that map
into a conventional form, so a renderer can draw it without knowing your app.
Your app writes the content at record time, where it knows what happened; the
renderer recognises the form later.

Core defines the `Storyfeed\Contracts\FeedDetail` interface. This package supplies
an implementation. You choose the key under `data` and store the detail's array;
core passes that array through unchanged. Its form name (`$detail`) and version
(`$v`) travel with it, so the renderer can upgrade it at read time without
rewriting stored history. A missing version means version 1. Renderers skip
unknown forms without hiding the activity, and details do not nest.

## Markdown

After installing, this example runs as a PHP script from your application root:

```php
<?php

require 'vendor/autoload.php';

use Storyfeed\Ui\Data\Markdown;

$data = [
    'notes' => Markdown::make('Delivery moved to **Friday**.')->toArray(),
];

print_r($data['notes']);
```

The `notes` value is:

```php
[
    '$detail' => 'storyfeed-ui/markdown',
    '$v' => 1,
    'content' => 'Delivery moved to **Friday**.',
    'mediaType' => 'text/markdown',
]
```

Pass `$data` to your Storyfeed activity builder's `data($data)` method when
recording the activity. The key `notes` is your choice, not a reserved payload key.

Markdown stores source, including any authored HTML; it does not compile or
sanitize it. The renderer is responsible for converting it safely for display.

## Documentation

Recording activities, reading feeds and the payload contract are documented at
[docs.storyfeed.dev](https://docs.storyfeed.dev), which tracks core's `main` branch.
The [FeedDetail interface](https://github.com/storyfeed/storyfeed/blob/main/src/Contracts/FeedDetail.php)
describes the conventions for detail authors and renderers.

## Credits

- [Jasper Tey](https://github.com/jaspertey) / [Tey Labs](https://teylabs.com)
- [All Contributors](../../contributors)

## License

The MIT License (MIT). Please see [License File](LICENSE.md) for more information.
