<?php

namespace Storyfeed\Ui\Tests\Arch;

/** Static shipping boundary: workbench/, build/ and dependencies are never scanned. */
final class TailwindGuard
{
    /** @param array<string, array<int, array{pattern: string, reason: string, count: int}>> $allowlist
     * @return list<string>
     */
    public static function violations(string $file, string $source, array $allowlist = []): array
    {
        $source = str_replace("\r\n", "\n", $source);
        $errors = [];
        if (str_ends_with(strtolower($file), '.css')) {
            $errors[] = "$file: shipped CSS is forbidden";
        }
        if (preg_match('/<style\b/i', $source)) {
            $errors[] = "$file: style blocks are forbidden";
        }
        foreach ($allowlist[$file] ?? [] as $entry) {
            if (trim($entry['reason']) === '' || substr_count($source, $entry['pattern']) !== $entry['count']) {
                $errors[] = "$file: stale or unexplained exception";
            } else {
                $source = str_replace($entry['pattern'], '', $source);
            }
        }
        // Include Blade attribute-bag merges and Vue object bindings, not just HTML attributes.
        if (preg_match('/(?<![\w-])(?:v-bind:style|:style|style)\s*=|[\'\"]style[\'\"]\s*=>|[,{]\s*(?:style|[\'\"]style[\'\"])\s*:/i', $source)) {
            $errors[] = "$file: unlisted style binding";
        }

        return $errors;
    }
}
