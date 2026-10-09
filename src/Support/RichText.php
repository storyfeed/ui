<?php

namespace Storyfeed\Ui\Support;

use League\CommonMark\GithubFlavoredMarkdownConverter;
use Symfony\Component\HtmlSanitizer\HtmlSanitizer;
use Symfony\Component\HtmlSanitizer\HtmlSanitizerConfig;

/** Render recognised prose encodings safely, without changing stored source. Markdown is GitHub-flavoured. */
final class RichText
{
    private static ?HtmlSanitizer $sanitizer = null;

    public static function render(string $content, string $mediaType): string
    {
        $html = match ($mediaType) {
            'text/markdown' => (string) (new GithubFlavoredMarkdownConverter([
                'html_input' => 'strip',
                'allow_unsafe_links' => false,
            ]))->convert($content),
            'text/html' => $content,
            default => htmlspecialchars($content, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8'),
        };

        if (self::$sanitizer === null) {
            $config = (new HtmlSanitizerConfig);
            foreach (['p', 'br', 'strong', 'em', 's', 'del', 'blockquote', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'pre', 'code', 'a', 'hr', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'input'] as $element) {
                $config = $config->allowElement($element, match ($element) {
                    'a' => ['href', 'title'], 'ol' => ['start'], 'th', 'td' => ['align'], 'input' => ['type', 'checked', 'disabled'], default => []
                });
            }
            self::$sanitizer = new HtmlSanitizer(
                $config
                    ->allowLinkSchemes(['http', 'https', 'mailto'])
                    ->allowRelativeLinks()
                    ->allowMediaSchemes(['http', 'https'])
                    ->allowRelativeMedias()
                    // Prose has no truncation flag: do not silently cut its content.
                    ->withMaxInputLength(-1)
            );
        }

        return self::taskBoxes(self::$sanitizer->sanitize($html));
    }

    /** Keep an input only as a task list's read-only checkbox. */
    private static function taskBoxes(string $html): string
    {
        return (string) preg_replace_callback('/<input\b[^>]*>/i', function (array $match): string {
            $type = preg_match('/\stype="([^"]*)"/i', $match[0], $found) === 1 ? strtolower($found[1]) : null;

            if ($type !== 'checkbox' || preg_match('/\sdisabled(?=[\s\/=>])/i', $match[0]) !== 1) {
                return '';
            }

            return '<input type="checkbox" disabled'.(preg_match('/\schecked(?=[\s\/=>])/i', $match[0]) === 1 ? ' checked' : '').' />';
        }, $html);
    }
}
