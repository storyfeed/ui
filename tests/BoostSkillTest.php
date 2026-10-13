<?php

use Storyfeed\Ui\Tests\Support\BoostSurface;

/**
 * The Boost guideline and skill are the kits' agent edition: `boost:install`
 * copies them into an app, and an agent follows them instead of reading the
 * kit's source. A name they give that this package does not ship (a renamed
 * prop, a removed export, a provide key that moved) becomes a broken app.
 * This fails when either file names a Blade component or prop, a Vue or
 * React export or prop, a FEED_* key, a support class, a command option or a
 * vendor path that does not exist here. Update the files in the same PR as
 * the API change.
 */
function boost_files(): array
{
    $root = dirname(__DIR__).'/resources/boost';

    return [
        'guideline' => $root.'/guidelines/core.blade.php',
        'skill' => $root.'/skills/storyfeed-ui/SKILL.md',
    ];
}

it('ships a guideline and a skill where Boost discovers them', function () {
    foreach (boost_files() as $file) {
        expect(is_file($file))->toBeTrue("{$file} is missing");
    }

    $skill = str_replace("\r\n", "\n", (string) file_get_contents(boost_files()['skill']));

    expect($skill)->toMatch('/\A---\nname: storyfeed-ui\ndescription: \S.+\n---\n/');
});

it('names only components, props, exports and keys this package ships', function (string $file) {
    $problems = (new BoostSurface(dirname(__DIR__)))->problems((string) file_get_contents($file));

    expect($problems)->toBe([], basename($file).' names what the kits do not ship: '.implode('; ', $problems));
})->with(fn () => array_map(fn (string $file) => [$file], boost_files()));

it('covers the issue #89 topics', function () {
    $text = implode("\n", array_map('file_get_contents', boost_files()));

    foreach (['storyfeed:ui vue', 'storyfeed:ui react', '@source "../js/components/storyfeed"',
        '@source "../../vendor/storyfeed/ui/resources/js"', '@source "../../vendor/storyfeed/ui/resources/views"',
        '@theme', 'image-size', 'imageSize', 'viewer', 'child-rail', 'FEED_BODIES', 'FeedMedia', 'payload'] as $needle) {
        expect($text)->toContain($needle);
    }
});

it('catches a name the kits do not ship', function (string $text, string $problem) {
    $problems = (new BoostSurface(dirname(__DIR__)))->problems($text);

    expect(implode("\n", $problems))->toContain($problem);
})->with([
    'Blade component' => ['<x-storyfeed::timeline :page="$page" />', 'Blade component <x-storyfeed::timeline> does not exist'],
    'Blade prop' => ['<x-storyfeed::feed :page="$page" picture-size="card" />', '<x-storyfeed::feed> has no picture-size prop'],
    'provide key' => ['Provide FEED_ROUTER from the keys.', 'Provide key FEED_ROUTER exists in neither kit'],
    'React export' => ["```tsx\nimport { FeedTimeline } from '@/components/storyfeed';\n```", "'@/components/storyfeed' does not export FeedTimeline"],
    'Vue module' => ["```vue\n<script setup lang=\"ts\">\nimport FeedList from '@/components/storyfeed/FeedList.vue';\n</script>\n```", "Import '@/components/storyfeed/FeedList.vue' resolves to no file"],
    'shared export' => ["```ts\nimport { sizeOf } from '@storyfeed/shared/body';\n```", "'@storyfeed/shared/body' does not export sizeOf"],
    'Vue prop' => ["```vue\n<template><FeedStream :page=\"feed\" picture-size=\"card\" /></template>\n```", 'vue FeedStream has no picture-size prop'],
    'Vue event' => ["```vue\n<template><FeedStream :page=\"feed\" @more=\"load\" /></template>\n```", 'vue FeedStream has no @more prop'],
    'React prop' => ["```tsx\n<FeedStream page={feed} pictureSize=\"card\" onMore={() => { load(); }} />\n```", 'react FeedStream has no pictureSize prop'],
    'prop table' => ["## Feed props\n\n| Blade / Vue | React | Does |\n|---|---|---|\n| `density` | `density` | row spacing |\n", 'Blade feed has no density prop'],
    'PHP method' => ['`\Storyfeed\Ui\Support\Bodies::image($body)`', 'Storyfeed\Ui\Support\Bodies::image() does not exist'],
    'command kit' => ['php artisan storyfeed:ui svelte', 'storyfeed:ui has no svelte kit'],
    'command option' => ['php artisan storyfeed:ui vue --dry-run', 'storyfeed:ui has no --dry-run option'],
    'publish tag' => ['php artisan vendor:publish --tag=storyfeed-kit', 'No publish tag storyfeed-kit'],
    'vendor path' => ['@source "../../vendor/storyfeed/ui/resources/css";', 'Path vendor/storyfeed/ui/resources/css does not exist'],
]);
