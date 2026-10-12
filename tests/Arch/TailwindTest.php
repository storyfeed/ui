<?php

use Storyfeed\Ui\Tests\Arch\TailwindGuard;

it('ships only Tailwind utilities with reviewed runtime exceptions', function () {
    $root = dirname(__DIR__, 2);
    $allowlist = require $root.'/tests/tailwind-allowlist.php';
    $errors = [];
    $seen = [];
    foreach (new RecursiveIteratorIterator(new RecursiveDirectoryIterator($root.'/resources', FilesystemIterator::SKIP_DOTS)) as $file) {
        if (! $file->isFile()) {
            continue;
        }
        $path = str_replace('\\', '/', substr($file->getPathname(), strlen($root) + 1));
        // Markdown usage examples are documentation, not shipped executable markup.
        if (! preg_match('/\.(css|php|vue|tsx|jsx|html)$/i', $path)) {
            continue;
        }
        $seen[] = $path;
        $errors = [...$errors, ...TailwindGuard::violations($path, file_get_contents($file->getPathname()), $allowlist)];
    }
    foreach (array_keys($allowlist) as $path) {
        if (! in_array($path, $seen, true)) {
            $errors[] = "$path: exception file no longer exists";
        }
    }
    expect($errors)->toBe([]);
});

it('rejects new CSS, style blocks and each binding syntax', function (string $path, string $source) {
    expect(TailwindGuard::violations($path, $source))->not->toBeEmpty();
})->with([
    ['resources/new.css', ''],
    ['resources/new.vue', '<STYLE scoped>p { color: red }</STYLE>'],
    ['resources/new.blade.php', '<p style="color:red">'],
    ['resources/new.vue', '<p :style="color">'],
    ['resources/new.vue', '<p v-bind:style="color">'],
    ['resources/new.tsx', '<p style={{ color: "red" }}>'],
    ['resources/new.blade.php', "\$attributes->merge(['style' => 'color:red'])"],
    ['resources/new.vue', '{ style: frame.style }'],
    ['resources/new.vue', '{ style: { color: \"red\" } }'],
]);

it('does not allow a second binding, changed exception or stale exception', function () {
    $allowlist = require dirname(__DIR__).'/tailwind-allowlist.php';
    foreach ($allowlist as $path => $entries) {
        $source = implode("\n", array_map(fn ($entry) => str_repeat($entry['pattern'], $entry['count']), $entries));
        expect(TailwindGuard::violations($path, $source, $allowlist))->toBe([])
            ->and(TailwindGuard::violations($path, str_replace("\n", "\r\n", $source), $allowlist))->toBe([])
            ->and(TailwindGuard::violations($path, $source.'<p style="color:red">', $allowlist))->not->toBeEmpty()
            ->and(TailwindGuard::violations($path, '', $allowlist))->not->toBeEmpty();
        foreach ($entries as $entry) {
            expect(TailwindGuard::violations($path, str_replace($entry['pattern'], substr_replace($entry['pattern'], 'CHANGED', -1), $source), $allowlist))->not->toBeEmpty();
        }
    }
});

it('accepts only exact pre and post variable avatar bindings', function () {
    $allowlist = require dirname(__DIR__).'/tailwind-allowlist.php';
    foreach ($allowlist as $path => $entries) {
        foreach ($entries as $entry) {
            if (! isset($entry['legacy_pattern'])) {
                continue;
            }
            expect(TailwindGuard::violations($path, $entry['legacy_pattern'], $allowlist))->toBe([])
                ->and(TailwindGuard::violations($path, $entry['pattern'], $allowlist))->toBe([])
                ->and(TailwindGuard::violations($path, $entry['legacy_pattern'].$entry['pattern'], $allowlist))->not->toBeEmpty();
        }
    }
});

it('requires exception kind and never admits new debt', function () {
    foreach ([null, 'unknown', 'debt'] as $kind) {
        $entry = ['pattern' => 'style={color}', 'reason' => 'Runtime colour.', 'count' => 1, 'kind' => $kind];
        expect(TailwindGuard::violations('new.tsx', 'style={color}', ['new.tsx' => [$entry]]))->not->toBeEmpty();
    }
});
