<?php

namespace Storyfeed\Ui;

use Illuminate\Support\HtmlString;

/**
 * The kit's default stylesheet, for `@storyfeedStyles`.
 *
 * Inlined, as `@livewireStyles` inlines Livewire's: one directive in the
 * layout's head and the feed looks right, with no asset to publish, no route
 * to serve it and no build step. An app that would rather serve or bundle the
 * file publishes it (`--tag=storyfeed-assets`) or imports it from vendor.
 */
final class Styles
{
    private static ?string $css = null;

    public static function path(): string
    {
        return dirname(__DIR__).'/resources/css/storyfeed.css';
    }

    public static function inline(): HtmlString
    {
        self::$css ??= (string) file_get_contents(self::path());

        return new HtmlString('<style>'.self::$css.'</style>');
    }
}
