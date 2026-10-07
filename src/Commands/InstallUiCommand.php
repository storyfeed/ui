<?php

namespace Storyfeed\Ui\Commands;

use Illuminate\Console\Command;
use Illuminate\Filesystem\Filesystem;
use Symfony\Component\Console\Output\OutputInterface;

class InstallUiCommand extends Command
{
    protected $signature = 'storyfeed:ui {kit : The kit to copy (vue)}
        {--path=resources/js/components/storyfeed : Destination directory, relative to the app or absolute}
        {--force : Overwrite files that differ}
        {--diff : Print unified diffs for files that differ}';

    protected $description = 'Copy the Storyfeed UI kit into your app, preserving your edits';

    public function handle(Filesystem $files): int
    {
        if ($this->argument('kit') !== 'vue') {
            $this->error('Unknown kit. Run php artisan storyfeed:ui vue.');

            return self::FAILURE;
        }

        $path = $this->option('path');
        if (! is_string($path) || trim($path) === '') {
            $this->error('--path must be a non-empty directory.');

            return self::FAILURE;
        }

        $destination = str_starts_with($path, '/') || preg_match('/^[A-Za-z]:[\\\\\/]/', $path)
            ? $path : base_path($path);
        $source = dirname(__DIR__, 2).'/resources/js/vue';
        $written = $unchanged = $differs = 0;

        foreach ($files->allFiles($source) as $file) {
            $relative = $file->getRelativePathname();
            $target = $destination.DIRECTORY_SEPARATOR.$relative;
            $incoming = $files->get($file->getPathname());

            if ($files->exists($target)) {
                if ($files->get($target) === $incoming) {
                    $unchanged++;

                    continue;
                }

                if ($this->option('diff')) {
                    $this->output->write($this->unifiedDiff($files->get($target), $incoming, $relative), false, OutputInterface::OUTPUT_RAW);
                }

                if (! $this->option('force')) {
                    $differs++;
                    $this->warn('Differs: '.$relative.' (kept). Use --diff to review or --force to overwrite.');

                    continue;
                }
            }

            $files->ensureDirectoryExists(dirname($target));
            $files->put($target, $incoming);
            $written++;
            $this->line('Written: '.$relative);
        }

        $this->info("Written: {$written}; unchanged: {$unchanged}; differs: {$differs}.");
        // Tailwind resolves @source relative to the CSS file, not the app root.
        $cssDirectory = resource_path('css');
        $cssSource = $this->relativePath($cssDirectory, $destination);
        $this->line('In resources/css/app.css, add once if this path is not already scanned:');
        $this->line('@source "'.str_replace(['\\', '"'], ['/', '\\"'], $cssSource).'";');
        $this->line('Components expect the Laravel Vue starter-kit colour tokens and Tailwind v4.');
        $this->line('Install Vue 3, lucide-vue-next, markdown-it and sanitize-html in your app.');
        $this->line('Copied files belong to your app. Edit freely; rerun with --diff to review updates.');

        return self::SUCCESS;
    }

    /** A portable, single-hunk unified patch bounded by unchanged context. */
    private function unifiedDiff(string $existing, string $incoming, string $name): string
    {
        $split = static function (string $text): array {
            if ($text === '') {
                return [];
            }
            $lines = explode("\n", $text);
            if (str_ends_with($text, "\n")) {
                array_pop($lines);
            }

            return $lines;
        };
        $old = $split($existing);
        $new = $split($incoming);
        $oldCount = count($old);
        $newCount = count($new);
        $oldTerminated = str_ends_with($existing, "\n");
        $newTerminated = str_ends_with($incoming, "\n");
        $prefix = 0;
        // Newline termination is part of a line, including a shared EOF line.
        while ($prefix < min($oldCount, $newCount) && $old[$prefix] === $new[$prefix]
            && ($prefix < $oldCount - 1 || $oldTerminated) === ($prefix < $newCount - 1 || $newTerminated)) {
            $prefix++;
        }
        $suffix = 0;
        while (($suffix > 0 || $oldTerminated === $newTerminated) && $suffix < min($oldCount, $newCount) - $prefix && $old[$oldCount - $suffix - 1] === $new[$newCount - $suffix - 1]) {
            $suffix++;
        }
        $start = max(0, $prefix - 3);
        $oldEnd = $oldCount - $suffix;
        $newEnd = $newCount - $suffix;
        $context = min(3, $suffix);
        $oldLength = $oldEnd + $context - $start;
        $newLength = $newEnd + $context - $start;
        $oldStart = $oldLength === 0 ? $start : $start + 1;
        $newStart = $newLength === 0 ? $start : $start + 1;
        $patch = "--- app/{$name}\n+++ kit/{$name}\n@@ -{$oldStart},{$oldLength} +{$newStart},{$newLength} @@\n";
        $line = static function (string $marker, string $value, bool $unterminated): string {
            return $marker.$value."\n".($unterminated ? "\\ No newline at end of file\n" : '');
        };
        for ($i = $start; $i < $prefix; $i++) {
            $patch .= $line(' ', $old[$i], $i === $oldCount - 1 && ! str_ends_with($existing, "\n"));
        }
        for ($i = $prefix; $i < $oldEnd; $i++) {
            $patch .= $line('-', $old[$i], $i === $oldCount - 1 && ! str_ends_with($existing, "\n"));
        }
        for ($i = $prefix; $i < $newEnd; $i++) {
            $patch .= $line('+', $new[$i], $i === $newCount - 1 && ! str_ends_with($incoming, "\n"));
        }
        for ($i = $oldEnd; $i < $oldEnd + $context; $i++) {
            $patch .= $line(' ', $old[$i], $i === $oldCount - 1 && ! str_ends_with($existing, "\n"));
        }

        return $patch;
    }

    private function relativePath(string $from, string $to): string
    {
        $normalise = static function (string $path): array {
            $parts = [];
            foreach (explode('/', str_replace('\\', '/', $path)) as $part) {
                if ($part === '..') {
                    array_pop($parts);
                } elseif ($part !== '' && $part !== '.') {
                    $parts[] = $part;
                }
            }

            return $parts;
        };
        $fromParts = $normalise($from);
        $toParts = $normalise($to);
        // A different Windows volume cannot be expressed as a relative path.
        if (isset($fromParts[0], $toParts[0]) && str_contains($fromParts[0], ':') && strcasecmp($fromParts[0], $toParts[0]) !== 0) {
            return str_replace('\\', '/', $to);
        }
        while ($fromParts !== [] && $toParts !== [] && $fromParts[0] === $toParts[0]) {
            array_shift($fromParts);
            array_shift($toParts);
        }

        return str_repeat('../', count($fromParts)).implode('/', $toParts);
    }
}
