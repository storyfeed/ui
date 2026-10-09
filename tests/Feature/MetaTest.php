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

it('draws the time range an activity describes after its time, collapsing a shared month or day', function (?string $startsAt, ?string $endsAt, ?string $expected) {
    $item = ['kind' => 'activity', 'headline' => 'Milestone', 'published_at' => '2026-10-09T12:00:00+00:00', 'starts_at' => $startsAt, 'ends_at' => $endsAt, 'instrument' => ['label' => 'Claude']];
    $html = render_blade('<x-storyfeed::meta :item="$item" />', compact('item'));

    $expected === null
        ? expect($html)->not->toContain('· <span>')->toContain('</time> · via')
        : expect($html)->toContain('</time> · <span>'.e($expected).'</span> · via');
})->with([
    'months' => ['2026-09-30T12:00:00+00:00', '2026-10-09T12:00:00+00:00', '30 Sep – 9 Oct 2026'],
    'one month' => ['2026-10-01T12:00:00+00:00', '2026-10-09T12:00:00+00:00', '1 – 9 Oct 2026'],
    'one day' => ['2026-10-09T09:00:00+00:00', '2026-10-09T17:00:00+00:00', '9 Oct 2026'],
    'years' => ['2025-12-30T12:00:00+00:00', '2026-01-02T12:00:00+00:00', '30 Dec 2025 – 2 Jan 2026'],
    'open end' => ['2026-10-09T12:00:00+00:00', null, 'from 9 Oct 2026'],
    'open start' => [null, '2026-10-31T12:00:00+00:00', 'until 31 Oct 2026'],
    'none' => [null, null, null],
    'unreadable' => ['not a date', '', null],
]);

it('reads a range in the feed\'s timezone and never draws one on a group', function () {
    $item = ['kind' => 'activity', 'headline' => 'Late', 'published_at' => '2026-10-09T12:00:00+00:00', 'starts_at' => '2026-10-09T23:30:00+00:00', 'ends_at' => '2026-10-10T23:30:00+00:00'];
    expect(render_blade('<x-storyfeed::meta :item="$item" timezone="Pacific/Auckland" />', compact('item')))->toContain('<span>10 – 11 Oct 2026</span>');

    $group = [...$item, 'kind' => 'group', 'count' => 2, 'children' => []];
    expect(render_blade('<x-storyfeed::meta :item="$group" />', ['group' => $group]))->not->toContain('Oct 2026</span>');
});
