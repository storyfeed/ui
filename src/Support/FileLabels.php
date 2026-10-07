<?php

namespace Storyfeed\Ui\Support;

final class FileLabels
{
    /** @var array<string, string> */
    private const LABELS = [
        'application/pdf' => 'PDF',
        'text/markdown' => 'Markdown',
        'text/csv' => 'Spreadsheet (CSV)',
        'application/msword' => 'Word document',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document' => 'Word document',
        'application/vnd.ms-excel' => 'Excel spreadsheet',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' => 'Excel spreadsheet',
        'application/zip' => 'ZIP archive',
        'text/plain' => 'Text file',
        'image/jpeg' => 'JPEG image',
        'image/png' => 'PNG image',
        'image/gif' => 'GIF image',
        'image/webp' => 'WebP image',
        'image/svg+xml' => 'SVG image',
    ];

    /**
     * @param  array<array-key, mixed>  $body
     * @param  (callable(array{name: ?string, mediaType: ?string}): ?string)|null  $labeller
     */
    public static function label(array $body, ?callable $labeller = null): ?string
    {
        $file = [
            'name' => is_string($body['name'] ?? null) ? $body['name'] : null,
            'mediaType' => is_string($body['mediaType'] ?? null) ? $body['mediaType'] : null,
        ];

        $label = $labeller ? $labeller($file) : null;
        if ($label !== null || $file['mediaType'] === null) {
            return $label;
        }

        $fallback = self::LABELS[$file['mediaType']] ?? $file['mediaType'];
        $translated = __($fallback);

        return is_string($translated) ? $translated : $fallback;
    }
}
