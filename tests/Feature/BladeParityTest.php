<?php

use Carbon\CarbonImmutable;
use Storyfeed\Support\Entity;
use Storyfeed\Support\FeedItem;
use Storyfeed\Ui\Support\Avatar;
use Storyfeed\Ui\Support\BodyComponents;
use Storyfeed\Ui\Support\Rail;

it('renders raw payloads with day nodes and per-item branches', function () {
    $items = [
        ['kind' => 'activity', 'id' => 'a', 'published_at' => '2026-09-25T11:00:00Z', 'headline' => 'Today update'],
        ['kind' => 'activity', 'id' => 'b', 'published_at' => '2026-09-24T11:00:00Z', 'headline' => 'Yesterday update'],
    ];
    $html = render_blade('<x-storyfeed::feed :items="$items" :dividers="[\'a\' => \'Timeline\']" divider-style="branch" />', compact('items'));
    expect($html)->toContain('<h2>Today</h2>', '<h2>Yesterday</h2>', '<h2>Timeline</h2>')
        ->and(substr_count($html, 'M0.75 22 V14 Q0.75 6 8.75 6 H15'))->toBe(3)
        ->and(render_blade('<x-storyfeed::feed :items="$items" :grouped="false" />', compact('items')))->not->toContain('<h2');
});

it('keeps the four rail configurations honest across absent and multiple actors', function () {
    expect(Rail::slots('actor', 1, true))->toBe(['disc' => 'actor', 'badge' => 'activity'])
        ->and(Rail::slots('activity', 1, true))->toBe(['disc' => 'activity', 'badge' => 'actor'])
        ->and(Rail::slots('actor-only', 0, true))->toBe(['disc' => 'activity', 'badge' => 'none'])
        ->and(Rail::slots('activity-only', 1, false))->toBe(['disc' => 'actor', 'badge' => 'none'])
        ->and(Rail::slots('actor', 2, true))->toBe(['disc' => 'actor', 'badge' => 'none'])
        ->and(Rail::slots('activity', 2, true))->toBe(['disc' => 'activity', 'badge' => 'none'])
        ->and(Rail::slots('actor', 1, true, true))->toBe(['disc' => 'actor', 'badge' => 'none'])
        ->and(Rail::slots(null, 0, false))->toBe(['disc' => 'none', 'badge' => 'none']);
    expect(fn () => Rail::slots('typo', 1, true))->toThrow(InvalidArgumentException::class);
});

it('uses snapshot colours and the Vue signed hash palette, with muted tombstones', function () {
    $entity = Entity::of(['type' => 'person', 'id' => 'ada', 'label' => 'Ada Lovelace']);
    expect(Avatar::initials($entity))->toBe('AL')->and(Avatar::initials($entity, true))->toBe('A')
        ->and(Avatar::color($entity))->toBe('#8b5cf6');
    $colored = Entity::of(['label' => 'Dana', 'data' => ['initials' => 'DX', 'avatar_color' => '#123456']]);
    expect(render_blade('<x-storyfeed::avatar :entity="$entity" />', ['entity' => $colored]))
        ->toContain('aria-label="Dana"', 'background-color: #123456', 'DX');
    $removed = Entity::of(['label' => 'Dana', 'tombstone' => ['formerType' => 'user'], 'data' => ['avatar_color' => '#123456'], 'media' => ['icon' => ['src' => '/old.jpg']]]);
    expect(Avatar::color($removed))->toBeNull()
        ->and(render_blade('<x-storyfeed::avatar :entity="$entity" />', ['entity' => $removed]))->not->toContain('#123456', '/old.jpg');
});

it('renders only allowlisted Component bodies and passes typed props without turning names into paths', function () {
    $views = sys_get_temp_dir().'/storyfeed-components-'.uniqid();
    mkdir($views.'/components', recursive: true);
    file_put_contents($views.'/components/message.blade.php', '@props([\'message\', \'options\'])<strong>{{ $message }} {{ $options[\'number\'] }}</strong>');
    app('view')->addNamespace('parity', $views);
    app(BodyComponents::class)->register('App/Message', 'parity::message');
    $body = ['$body' => 'Storyfeed/Body/Component', 'name' => 'App/Message', 'props' => ['message' => '<Hello>', 'options' => ['number' => 7]]];
    expect(render_blade('<x-storyfeed::body :body="$body" />', compact('body')))->toContain('<strong>&lt;Hello&gt; 7</strong>');
    foreach (['../../secrets', 'parity::message', 'Unknown'] as $name) {
        $body['name'] = $name;
        expect(render_blade('<x-storyfeed::body :body="$body" />', compact('body')))->toBe('');
    }
});

it('walks activity and object data for bodies while leaving other roles alone', function () {
    $body = fn ($text) => ['$body' => 'Storyfeed/Body/Excerpt', 'text' => $text];
    $item = FeedItem::of(['kind' => 'activity', 'data' => ['nested' => ['quote' => $body('Activity words')]], 'object' => ['body' => [$body('Object slot')], 'data' => ['custom' => $body('Object words')]], 'actor' => ['body' => [$body('Actor words')]]]);
    expect(render_blade('<x-storyfeed::activity :activity="$item" />', compact('item')))->toContain('Activity words', 'Object slot', 'Object words')->not->toContain('Actor words');
});

it('keeps empty known forms from producing empty body wrappers', function () {
    foreach (['KeyValue', 'Prose', 'Excerpt', 'Image', 'Component', 'FileAttachment', 'ItemList', 'MediaObject'] as $type) {
        expect(render_blade('<x-storyfeed::body :body="$body" />', ['body' => ['$body' => 'Storyfeed/Body/'.$type]]))->toBe('');
    }
});

it('supports server-only group state and host rendering seams', function () {
    $item = FeedItem::of(['kind' => 'group', 'headline' => 'Updates', 'count' => 4, 'published_at' => '2026-09-25T10:00:00Z', 'children' => [['kind' => 'activity', 'headline' => 'Child']]]);
    $renderers = ['time' => fn ($node) => '<a href="/activity">Timestamp</a>', 'body' => fn ($node) => '<p>App facts</p>', 'annotations' => fn ($node) => '<aside>Annotation</aside>'];
    $html = render_blade('<x-storyfeed::group :group="$item" :interactive="false" :renderers="$renderers" />', compact('item', 'renderers'));
    expect($html)->toContain('Child', '…and 3 more not shown', 'href="/activity"', 'App facts', 'Annotation')->not->toContain('<summary', '<time');
    expect(render_blade('<x-storyfeed::group :group="$item" :interactive="false" collapsed />', compact('item')))->not->toContain('Child', '<summary');
});

it('converts calendar rungs and hover titles to the supplied display zone', function () {
    $at = CarbonImmutable::parse('2026-09-25T01:00:00Z');
    expect(render_blade('<x-storyfeed::time :at="$at" timezone="America/Toronto" />', compact('at')))
        ->toContain('Yesterday, 9:00 PM', 'Thursday, 24 September 2026, 9:00:00 PM');
});

it('caps displayed summary phrases and leaves undrawn role tokens on the meta line', function () {
    $phrases = array_map(fn ($n) => ['count' => 1, 'headline_template' => $n === 4 ? 'used :instrument' : 'phrase '.$n], range(1, 4));
    $item = FeedItem::of(['kind' => 'group', 'axis' => 'summary', 'count' => 4, 'actor' => ['label' => 'Dana'], 'phrases' => $phrases, 'instrument' => ['label' => 'CLI']]);
    expect(render_blade('<x-storyfeed::group :group="$item" />', compact('item')))
        ->toContain('phrase 1, phrase 2, phrase 3 and 1 more', 'via <span>CLI</span>')->not->toContain('used');
});

it('uses a pinned meta entity ahead of the sample and keeps custom time separators honest', function () {
    $item = FeedItem::of(['kind' => 'group', 'headline' => 'Updates', 'instrument' => ['label' => 'Pinned'], 'sample' => ['instruments' => [['label' => 'Sample']]], 'distinct' => ['instruments' => 1]]);
    $renderer = fn ($node) => '<a href="/event">Recorded</a>';
    expect(render_blade('<x-storyfeed::meta :item="$item" :time-renderer="$renderer" />', compact('item', 'renderer')))
        ->toContain('Recorded</a> · via <span>Pinned</span>')->not->toContain('Sample');
    $renderer = fn ($node) => '';
    expect(render_blade('<x-storyfeed::meta :item="$item" :time-renderer="$renderer" />', compact('item', 'renderer')))
        ->toContain('via <span>Pinned</span>')->not->toContain(' · ');
});

it('keeps app body overrides optional and the payload intact', function () {
    $body = ['$body' => 'Storyfeed/Body/Prose', 'content' => '<Original>'];
    $renderer = fn ($form, $entity) => '<p>Replacement</p>';
    expect(render_blade('<x-storyfeed::body :body="$body" :renderer="$renderer" />', compact('body', 'renderer')))->toContain('Replacement')->not->toContain('Original');
    $renderer = fn ($form, $entity) => null;
    expect(render_blade('<x-storyfeed::body :body="$body" :renderer="$renderer" />', compact('body', 'renderer')))->toContain('&lt;Original&gt;')
        ->and($body)->toBe(['$body' => 'Storyfeed/Body/Prose', 'content' => '<Original>']);
});

it('hands pictures to host integration while retaining the body caption and media placement', function () {
    $body = ['$body' => 'Storyfeed/Body/Image', 'image' => 'preview', 'caption' => 'Caption'];
    $entity = Entity::of(['media' => ['preview' => ['src' => '/photo.jpg', 'width' => 160, 'height' => 100]]]);
    $mediaRenderer = fn ($tile, $classes) => '<button aria-label="View picture">'.e($tile['image']['src']).'</button>';
    expect(render_blade('<x-storyfeed::body :body="$body" :entity="$entity" :media-renderer="$mediaRenderer" />', compact('body', 'entity', 'mediaRenderer')))
        ->toContain('aria-label="View picture"', '/photo.jpg', '<figcaption>Caption</figcaption>')->not->toContain('<img');
    $body = ['$body' => 'Storyfeed/Body/MediaObject', 'image' => 'preview', 'subject' => 'Post', 'content' => 'Words'];
    expect(render_blade('<x-storyfeed::body.media-object :body="$body" :entity="$entity" image-placement="below" :media-renderer="$mediaRenderer" />', compact('body', 'entity', 'mediaRenderer')))
        ->toContain('Post', 'Words', 'View picture')->not->toContain('<img');
    $body = ['$body' => 'Storyfeed/Body/Prose', 'content' => 'Plain words'];
    expect(render_blade('<x-storyfeed::body :body="$body" :media-renderer="$mediaRenderer" />', compact('body', 'mediaRenderer')))
        ->toContain('Plain words')->not->toContain('media-renderer');
});
