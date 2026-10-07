<?php

use Carbon\CarbonImmutable;
use Storyfeed\Support\FeedItem;

it('puts activity and group metadata after the headline row', function (string $component, array $extra) {
    $item = FeedItem::of([
        'kind' => 'activity',
        'headline_template' => 'An update',
        'published_at' => '2026-09-25T11:00:00+00:00',
        'instrument' => ['label' => 'Claude', 'url' => '/tools/claude'],
        ...$extra,
    ]);
    $html = render_blade('<x-storyfeed::'.$component.' :'.$component.'="$item" />', compact('item'));
    expect($html)->toContain('<div><span>An update</span> </div> <div> <time')
        ->toContain('</time> · via <a href="/tools/claude">Claude</a>');
})->with([
    'activity' => ['activity', []],
    'group' => ['group', ['kind' => 'group', 'count' => 2, 'children' => []]],
    'digest' => ['group', ['kind' => 'digest', 'count' => 2, 'children' => []]],
]);

it('does not repeat singular or plural roles used in the headline', function (string $template) {
    $item = FeedItem::of([
        'headline_template' => $template,
        'instrument' => ['label' => 'Claude', 'url' => '/tools/claude'],
    ]);
    expect(render_blade('<x-storyfeed::activity :activity="$item" />', compact('item')))
        ->toContain('Claude')->not->toContain('via', ' · ');
})->with([':instrument updated something', ':instruments updated something']);

it('uses the selected missing headline when deciding leftover roles', function () {
    $item = FeedItem::of([
        'redundant' => true,
        'headline_template' => ':instrument updated something',
        'missing_headline_template' => 'An update was removed',
        'instrument' => ['label' => 'Claude'],
    ]);
    expect(render_blade('<x-storyfeed::activity :activity="$item" />', compact('item')))
        ->toContain('An update was removed')->toContain('via <span>Claude</span>');
});

it('joins leftover roles in order with translated lead-ins, leaving context off the meta line', function () {
    $item = FeedItem::of([
        'headline' => 'An update',
        'instrument' => ['label' => '<Claude>', 'url' => '/claude', 'attributes' => ['target' => '_blank']],
        'origin' => ['label' => 'Backlog'],
        'result' => ['label' => 'Done'],
        'context' => ['label' => 'Sprint 12'],
        'location' => ['label' => 'Toronto'],
        'generator' => ['label' => 'Storyfeed'],
    ]);
    __('storyfeed-ui::meta.instrument');
    app('translator')->addLines(['meta.instrument' => 'using'], 'en', 'storyfeed-ui');
    expect(render_blade('<x-storyfeed::meta :item="$item" />', compact('item')))->toBe(
        '<div> using <a href="/claude" target="_blank">&lt;Claude&gt;</a> · from <span>Backlog</span> · to <span>Done</span> · at <span>Toronto</span> · from <span>Storyfeed</span> </div>'
    );
});

it('joins group samples and their remaining count like the headline', function () {
    $item = FeedItem::of([
        'kind' => 'group',
        'count' => 4,
        'headline' => 'Updates',
        'sample' => ['instruments' => [['label' => 'Claude'], ['label' => 'CLI']]],
        'distinct' => ['instruments' => 4],
    ]);
    expect(render_blade('<x-storyfeed::meta :item="$item" />', compact('item')))
        ->toContain('via <span>Claude</span>, <span>CLI</span> and 2 more');
});

it('formats the calendar ladder while keeping the machine date and absolute hover', function (string $date, string $label) {
    $at = CarbonImmutable::parse($date);
    expect(render_blade('<x-storyfeed::time :at="$at" />', compact('at')))->toBe(
        '<time datetime="'.$at->toAtomString().'" title="'.$at->isoFormat('dddd, D MMMM YYYY, LTS').'">'.$label.'</time>'
    );
})->with([
    'today' => ['2026-09-25T10:00:00+00:00', '2 hours ago'],
    'yesterday' => ['2026-09-24T15:42:00+00:00', 'Yesterday, 3:42 PM'],
    'this year' => ['2026-09-22T15:42:00+00:00', 'Tue 22 Sep, 3:42 PM'],
    'older' => ['2025-10-06T15:42:00+00:00', '6 Oct 2025, 3:42 PM'],
    'local yesterday' => ['2026-09-24T23:42:00-04:00', 'Yesterday, 11:42 PM'],
]);
