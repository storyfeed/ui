<?php

namespace Storyfeed\Ui\Tests\Arch;

/** Static shipping boundary: workbench/, build/ and dependencies are never scanned. */
final class TailwindGuard
{
    /** @param array<string, array<int, array{pattern: string, reason: string, count: int, kind: string, legacy_pattern?: string}>> $allowlist
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
            // No new debt: UI starts with an empty legacy-debt inventory.
            if (($entry['kind'] ?? null) !== 'genuine') {
                $errors[] = "$file: exceptions need a valid kind; debt must be burned down, never added";
            }
            $patterns = [$entry['pattern'], ...isset($entry['legacy_pattern']) ? [$entry['legacy_pattern']] : []];
            $count = array_sum(array_map(fn ($pattern) => substr_count($source, $pattern), $patterns));
            if (trim($entry['reason']) === '' || $count !== $entry['count']) {
                $errors[] = "$file: stale or unexplained exception";
            } else {
                $source = str_replace($patterns, '', $source);
            }
        }
        // Include Blade attribute-bag merges and Vue object bindings, not just HTML attributes.
        if (preg_match('/(?<![\w-])(?:v-bind:style|:style|style)\s*=|[\'\"]style[\'\"]\s*=>|[,{]\s*(?:style|[\'\"]style[\'\"])\s*:/i', $source)) {
            $errors[] = "$file: unlisted style binding";
        }

        return $errors;
    }
}
