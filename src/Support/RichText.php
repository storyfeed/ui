<?php

namespace Storyfeed\Ui\Support;

use Illuminate\Support\Str;
use Symfony\Component\HtmlSanitizer\HtmlSanitizer;
use Symfony\Component\HtmlSanitizer\HtmlSanitizerConfig;

/** Render recognised prose encodings safely, without changing stored source. */
final class RichText
{
    private static ?HtmlSanitizer $sanitizer = null;

    public static function render(string $content, string $mediaType): string
    {
        $html = match ($mediaType) {
            'text/markdown' => Str::markdown($content, [
                'html_input' => 'strip',
                'allow_unsafe_links' => false,
            ]),
            'text/html' => $content,
            default => htmlspecialchars($content, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8'),
        };

        self::$sanitizer ??= new HtmlSanitizer(
            (new HtmlSanitizerConfig)
                ->allowSafeElements()
                ->allowRelativeLinks()
                ->allowMediaSchemes(['http', 'https'])
                ->allowRelativeMedias()
                // Prose has no truncation flag: do not silently cut its content.
                ->withMaxInputLength(-1)
        );

        return self::$sanitizer->sanitize($html);
    }
}
