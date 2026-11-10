<?php

use Illuminate\Support\Facades\Blade;

/*
 * The documented host seams: CSS variables a host sets instead of reaching
 * into `.sf-*` classes, and `:media-objects` to leave MediaObject bodies out.
 */

function seam_activity(string $id): array
{
    return [
        'kind' => 'activity', 'id' => $id, 'verb' => 'post', 'published_at' => '2026-10-07T12:00:00Z',
        'headline_template' => ':actor posted', 'actor' => ['type' => 'user', 'id' => '1', 'label' => 'Ada'],
        'object' => ['type' => 'post', 'id' => '9', 'label' => 'Post', 'body' => [
            ['$body' => 'Storyfeed/Body/MediaObject', 'subject' => 'Post subject', 'content' => 'Post words'],
            ['$body' => 'Storyfeed/Body/Prose', 'content' => 'Kept prose'],
        ]],
    ];
}

function seam_group(): array
{
    return [...seam_activity('group'), 'kind' => 'group', 'axis' => 'repeat', 'count' => 2,
        'children' => [seam_activity('m1'), seam_activity('m2')], 'sample' => ['actors' => [['label' => 'Ada']]], 'distinct' => ['actors' => 1]];
}

it('draws each seam as a CSS variable defaulting to the value the kit drew before', function () {
    $items = [seam_group(), seam_activity('a2'), seam_activity('a3')];
    $html = Blade::render('<x-storyfeed::feed :items="$items" next-cursor="next" />', compact('items'));

    expect($html)
        ->toContain('sf-body min-w-0 flex-1 pt-[var(--sf-body-pt,max(0px,calc((var(--sf-disc-v)-1lh)/2)))] [line-height:var(--sf-body-leading)] [color:var(--sf-body-color)]')
        ->toContain('sf-body--spaced pb-[var(--sf-row-gap,--spacing(5))]')
        ->toContain('sf-rail__line mt-[var(--sf-rail-line-offset,--spacing(1))] w-[var(--sf-rail-line-width,1px)]')
        ->toContain('<div class="mt-[var(--sf-rail-line-offset,--spacing(1))] w-[var(--sf-rail-line-width,1px)] flex-1 bg-border"')
        ->not->toMatch('/sf-body[^"]* pb-5/')
        ->not->toMatch('/sf-rail__line[^"]* (mt-1|w-px) /')
        // Dense group members take the same row gap.
        ->toMatch('/sf-body--spaced pb-\[var\(--sf-row-gap,--spacing\(5\)\)\] sf-body--dense/');

    $group = seam_group();
    expect(Blade::render('<x-storyfeed::group :group="$group" last />', compact('group')))->toContain(':has(>.sf-disclosure[open])]:pb-[var(--sf-row-gap,--spacing(5))]');

    $dot = Blade::render('<x-storyfeed::feed :items="$items" divider-style="dot" />', compact('items'));
    // A divider's line keeps its own offset; only its width is a seam.
    expect($dot)->toContain('sf-rail__line mt-1 w-[var(--sf-rail-line-width,1px)]')
        ->and(Blade::render('<x-storyfeed::feed :items="$items" />', compact('items')))
        ->toContain('sf-rail__line mt-[calc(0.5625em-0.5px+var(--spacing)*2)] w-[var(--sf-rail-line-width,1px)]');
});

it('keeps MediaObject bodies by default and drops them with :media-objects="false", members included', function () {
    $items = [seam_group(), seam_activity('a2')];
    $shown = Blade::render('<x-storyfeed::feed :items="$items" :collapsed="false" />', compact('items'));
    $hidden = Blade::render('<x-storyfeed::feed :items="$items" :collapsed="false" :media-objects="false" />', compact('items'));

    expect(substr_count($shown, 'class="sf-media-object '))->toBe(3)
        ->and($hidden)->not->toContain('sf-media-object')->not->toContain('Post subject')->not->toContain('Post words')
        ->and(substr_count($hidden, 'Kept prose'))->toBe(3);

    $group = seam_group();
    expect(Blade::render('<x-storyfeed::group :group="$group" :media-objects="false" />', compact('group')))->not->toContain('sf-media-object')
        ->and(Blade::render('<x-storyfeed::item :item="$group" :media-objects="false" />', compact('group')))->not->toContain('sf-media-object');
});
