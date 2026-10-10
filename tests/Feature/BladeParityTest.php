<?php

use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Blade;
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
        ->and(Rail::slots('actor', 2, true))->toBe(['disc' => 'actor', 'badge' => 'activity'])
        ->and(Rail::slots('actor', 3, true))->toBe(['disc' => 'actor', 'badge' => 'activity'])
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

it('prefers declared media initials and colour, with contrasting text', function () {
    $declared = Entity::of(['label' => 'Acme Co', 'media' => ['icon' => null, 'initials' => 'AC', 'color' => '#e6f2f3'], 'data' => ['initials' => 'OLD', 'avatar_color' => '#123456']]);
    $html = Blade::render('<x-storyfeed::avatar :entity="$entity" />', ['entity' => $declared]);
    expect(Avatar::initials($declared))->toBe('AC')->and(Avatar::initials($declared, true))->toBe('A')
        ->and(Avatar::color($declared))->toBe('#e6f2f3')->and(Avatar::darkText($declared))->toBeTrue()
        ->and($html)->toContain('background-color: #e6f2f3', 'text-black', 'AC')->not->toContain('text-white', 'OLD');

    $deep = Entity::of(['label' => 'Acme Co', 'media' => ['initials' => 'AC', 'color' => '#1e3a40']]);
    expect(Avatar::darkText($deep))->toBeFalse()
        ->and(Blade::render('<x-storyfeed::avatar :entity="$entity" />', ['entity' => $deep]))->toContain('text-white')->not->toContain('text-black');

    // Malformed or absent declarations fall back to the older data, then the hash.
    $legacy = Entity::of(['label' => 'Dana', 'media' => ['initials' => '', 'color' => 'teal'], 'data' => ['initials' => 'DX', 'avatar_color' => '#FAF6EF']]);
    expect(Avatar::initials($legacy))->toBe('DX')->and(Avatar::color($legacy))->toBe('#FAF6EF')->and(Avatar::darkText($legacy))->toBeFalse();

    $removed = Entity::of(['label' => 'Acme Co', 'tombstone' => ['formerType' => 'project'], 'media' => ['initials' => 'AC', 'color' => '#e6f2f3']]);
    expect(Avatar::color($removed))->toBeNull()->and(Avatar::darkText($removed))->toBeFalse();
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
    expect(Blade::render('<x-storyfeed::group :group="$item" :interactive="false" collapsed />', compact('item')))->toContain('Child', 'hidden print:block')->not->toContain('<summary');
});

it('converts calendar rungs and hover titles to the supplied display zone', function () {
    $at = CarbonImmutable::parse('2026-09-25T01:00:00Z');
    expect(render_blade('<x-storyfeed::time :at="$at" timezone="America/Toronto" />', compact('at')))
        ->toContain('Yesterday, 9:00 PM', 'Thursday, 24 September 2026, 9:00:00 PM');
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

it('uses only pinned group singulars', function () {
    foreach (['actor', 'object', 'target', 'context', 'instrument', 'origin', 'result', 'location', 'generator'] as $role) {
        $item = ['kind' => 'group', 'count' => 2, 'headline_template' => ':'.$role, 'sample' => [$role.'s' => [['label' => 'Exemplar']]], 'distinct' => [$role.'s' => 1]];
        $html = Blade::render('<x-storyfeed::group :group="$item" />', compact('item'));
        $head = explode('<div class="sf-meta', explode('class="sf-head ', $html)[1])[0];
        expect($head)->not->toContain('Exemplar');
        $item[$role] = ['label' => 'Pinned'];
        expect(render_blade('<x-storyfeed::group :group="$item" />', compact('item')))->toContain('Pinned');
    }
});

/** A group's strip in order (a src, `tile:<initials>` or `+N`) and its links, or null when there is none. */
function strip_tiles(string $html): ?array
{
    $html = (string) preg_replace('/<!--.*?-->/s', '', $html);
    if (! str_contains($html, 'sf-media-strip ')) {
        return null;
    }
    $section = preg_split('/sf-toggle|sf-children/', explode('sf-media-strip ', $html, 2)[1])[0];
    preg_match_all('/<img[^>]+src="([^"]+)"|class="[^"]*sf-avatar--tile[^"]*"[^>]*>([^<]*)<|sf-media-strip__more[^>]*>\+(\d+)</', $section, $matches, PREG_SET_ORDER);
    preg_match_all('/href="([^"]+)"/', $section, $hrefs);

    return [
        'tiles' => array_map(fn (array $m) => ($m[1] ?? '') !== '' ? $m[1] : (isset($m[3]) ? '+'.$m[3] : 'tile:'.trim($m[2])), $matches),
        'hrefs' => $hrefs[1],
    ];
}

it('draws a group strip of one tile per member activity, never a blank', function () {
    $photo = fn (int $n) => ['type' => 'photo', 'id' => (string) $n, 'label' => "IMG_{$n}.jpg", 'url' => "/photos/{$n}", 'body' => [['$body' => 'Storyfeed/Body/Image', 'image' => 'preview']], 'media' => ['preview' => ['src' => "/p{$n}.jpg", 'width' => 192, 'height' => 144]]];
    $ana = ['type' => 'person', 'id' => 'ana', 'label' => 'Ana Silva', 'url' => '/people/ana', 'media' => ['icon' => ['src' => '/ana.jpg']]];
    $ben = ['type' => 'person', 'id' => 'ben', 'label' => 'Ben Okafor', 'url' => '/people/ben', 'media' => ['icon' => null, 'initials' => 'BO', 'color' => '#438d98']];
    $gone = ['type' => 'person', 'id' => 'cara', 'label' => null, 'url' => null, 'media' => ['icon' => null, 'initials' => '?', 'color' => '#6b7280'], 'tombstone' => ['formerType' => 'person']];
    $dee = ['type' => 'person', 'id' => 'dee', 'label' => 'Dee Ford', 'url' => '/people/dee', 'media' => null];
    $draw = function (array $objects, ?int $count = null) {
        $item = ['kind' => 'group', 'headline' => 'Updates', 'count' => $count ?? count($objects), 'children' => array_map(fn ($object) => ['kind' => 'activity', 'headline' => 'Member', 'object' => $object], $objects)];

        return strip_tiles(Blade::render('<x-storyfeed::group :group="$item" />', compact('item')));
    };

    // Pictures (an Image body, else the icon), else the avatar; past four tiles, three and "+N" from the count.
    expect($draw([$photo(1), $ana, $ben, $photo(2), $photo(3), $photo(4)]))
        ->toBe(['tiles' => ['/p1.jpg', '/ana.jpg', 'tile:BO', '+3'], 'hrefs' => ['/photos/1', '/people/ana', '/people/ben']])
        ->and($draw([$photo(1), $ana, $ben, $photo(2)])['tiles'])->toBe(['/p1.jpg', '/ana.jpg', 'tile:BO', '/p2.jpg'])
        // Members the server didn't ship still count.
        ->and($draw([$photo(1), $ben], 9)['tiles'])->toBe(['/p1.jpg', 'tile:BO', '+7'])
        // A deleted entity is a muted, unlinked tile; an entity without declared media still gets its initials.
        ->and($draw([$ben, $gone, $dee]))->toBe(['tiles' => ['tile:BO', 'tile:?', 'tile:DF'], 'hrefs' => ['/people/ben', '/people/dee']])
        // A member that features nothing has no tile, but is counted.
        ->and($draw([$ben, $photo(1), null])['tiles'])->toBe(['tile:BO', '/p1.jpg', '+1'])
        // Identical tiles, or nothing featured (never the actor), draw no strip.
        ->and($draw([$ben, $ben, $ben]))->toBeNull()
        ->and($draw([null, null]))->toBeNull();

    // Jasper (ui#27): "+N" opens the group like "Show all N"; a static group keeps a plain tile.
    $item = ['kind' => 'group', 'id' => 'g6', 'headline' => 'Updates', 'count' => 6, 'children' => array_map(fn ($object) => ['kind' => 'activity', 'headline' => 'Member', 'object' => $object], [$photo(1), $ana, $ben, $photo(2), $photo(3), $photo(4)])];
    $live = Blade::render('<x-storyfeed::group :group="$item" />', compact('item'));
    expect($live)->toMatch('/<button type="button" aria-label="Show all 6" aria-expanded="false" aria-controls="sf-members-g6"/')->toContain('id="sf-members-g6"', 'ontoggle=');
    expect(Blade::render('<x-storyfeed::group :group="$item" :interactive="false" />', compact('item')))->not->toContain('<button type="button" aria-label="Show all 6"');
});

it('supports file MIME labels and host labellers through the feed without changing the body', function () {
    $body = ['$body' => 'Storyfeed/Body/FileAttachment', 'name' => 'report.csv', 'size' => 21_000_000, 'mediaType' => 'text/csv'];
    $item = ['kind' => 'activity', 'object' => ['label' => 'report.csv', 'body' => [$body]]];
    expect(render_blade('<x-storyfeed::feed :items="[$item]" />', compact('item')))->toContain('report.csv<span> Spreadsheet (CSV) · 21 MB</span>');
    $received = null;
    $renderers = ['fileLabel' => function ($file) use (&$received) {
        $received = $file;

        return '<Host label>';
    }];
    expect(render_blade('<x-storyfeed::feed :items="[$item]" :renderers="$renderers" />', compact('item', 'renderers')))->toContain('report.csv<span> &lt;Host label&gt; · 21 MB</span>');
    expect($received)->toBe(['name' => 'report.csv', 'mediaType' => 'text/csv'])->and($item['object']['body'][0])->toBe($body);
    $renderers = ['fileLabel' => fn ($file) => null];
    expect(render_blade('<x-storyfeed::feed :items="[$item]" :renderers="$renderers" />', compact('item', 'renderers')))->toContain('Spreadsheet (CSV)');
    foreach ([[76_000, '76 KB'], [2_516_582, '2.5 MB']] as [$size, $label]) {
        $body = ['name' => 'design.fig', 'size' => $size];
        expect(render_blade('<x-storyfeed::body.file-attachment :body="$body" />', compact('body')))->toContain('design.fig<span> '.$label.'</span>')->not->toContain('Figma');
    }
});

it('lets dense child rails answer a different question from the actor-badged parent', function () {
    $child = ['kind' => 'activity', 'headline' => 'Child', 'actor' => ['label' => 'Dana'], 'glyph' => 'file-up'];
    $item = ['kind' => 'group', 'headline' => 'Group', 'count' => 1, 'children' => [$child], 'glyph' => 'file-up', 'sample' => ['actors' => [['label' => 'Dana']]]];
    $html = Blade::render('<x-storyfeed::feed :items="[$item]" rail="actor" child-rail="activity-only" :interactive="false" />', compact('item'));
    expect($html)->toContain('sf-badge');
    $children = explode('class="sf-children', $html)[1];
    expect($children)->toContain('sf-icon')->not->toContain('class="sf-avatar ', 'sf-badge absolute');
});

it('draws an Image body naming the icon slot as the linked thumbnail and lets the media host take over', function () {
    $icon = ['src' => '/dal-icon.jpg', 'width' => 64, 'height' => 64];
    $item = ['kind' => 'activity', 'headline' => 'Dal published', 'object' => [
        'type' => 'dish', 'id' => '7', 'label' => 'Dal', 'url' => '/dishes/7', 'media' => ['icon' => $icon],
        'attributes' => ['target' => '_blank', 'data-route' => 'dish', 'href' => '/wrong', 'onClick' => 'bad()', 'bad name' => 'bad', 'nested' => []],
        'body' => [['$body' => 'Storyfeed/Body/Image', 'image' => 'icon', 'alt' => 'Dal'], ['$body' => 'Storyfeed/Body/KeyValue', 'items' => [['key' => 'Status', 'value' => 'Ready']]]],
    ]];
    $renderers = ['body' => fn ($node) => '<p>App facts</p>'];
    $template = '<x-storyfeed::feed :items="[$item]" :renderers="$renderers" :grouped="false" />';
    $html = Blade::render($template, compact('item', 'renderers'));
    $frame = explode('sf-object-media', $html)[1];
    expect($frame)->toContain('href="/dishes/7"', 'target="_blank"', 'data-route="dish"', 'src="/dal-icon.jpg"', 'alt="Dal"', 'size-10!', 'App facts', 'Status')
        ->not->toContain('/wrong', 'onClick', 'bad name', 'nested', 'sf-image');
    expect(strpos($frame, 'dal-icon.jpg'))->toBeLessThan(strpos($frame, 'Status'));
    $received = null;
    $renderers['media'] = function ($tile, $classes) use (&$received) {
        $received = $tile;

        return '<button class="'.e($classes).'">Lightbox</button>';
    };
    expect(Blade::render($template, compact('item', 'renderers')))->toContain('Lightbox', 'size-10!')->not->toContain('<img');
    expect($received)->toBe(['image' => [...$icon, 'alt' => 'Dal'], 'href' => '/dishes/7', 'attributes' => ['target' => '_blank', 'data-route' => 'dish']]);
    $item['object']['url'] = null;
    expect(Blade::render($template, compact('item', 'renderers')))->toContain('Lightbox');
    expect($received['href'])->toBeNull()->and($received['attributes'])->toBe([]);
    unset($renderers['media']);
    expect(explode('sf-object-media', Blade::render($template, compact('item', 'renderers')))[1])->not->toContain('<a', 'target="_blank"');
    $renderers['form'] = fn ($body) => ($body['$body'] ?? null) === 'Storyfeed/Body/Image' ? '<p>App image</p>' : null;
    expect(Blade::render($template, compact('item', 'renderers')))->toContain('App image')->not->toContain('sf-object-media');
});

it('shows no picture a row\'s bodies did not ask for', function (string $kind) {
    $object = ['type' => 'dish', 'id' => '7', 'label' => 'Dal', 'url' => '/dishes/7',
        'media' => ['icon' => ['src' => '/dal-icon.jpg', 'width' => 64, 'height' => 64], 'preview' => ['src' => '/dal.jpg']],
        'body' => [['$body' => 'Storyfeed/Body/KeyValue', 'items' => [['key' => 'Status', 'value' => 'Ready']]]]];
    $item = ['kind' => $kind, 'headline' => 'Dal published', 'object' => $object, 'children' => [['kind' => 'activity', 'headline' => 'Dal cooked', 'object' => $object]]];
    $html = Blade::render('<x-storyfeed::feed :items="[$item]" :grouped="false" />', compact('item'));
    expect($html)->not->toContain('sf-object-media', '<img');
    $item = ['kind' => 'activity', 'headline' => 'Dal published', 'object' => [...$object, 'body' => [['$body' => 'Storyfeed/Body/Image', 'image' => 'preview']]]];
    expect(Blade::render('<x-storyfeed::feed :items="[$item]" :grouped="false" />', compact('item')))->toContain('sf-image', 'src="/dal.jpg"')->not->toContain('sf-object-media');
})->with(['activity', 'group']);

it('retains printable static members and preserves interactive details print rules', function () {
    $item = ['kind' => 'group', 'headline' => 'Two confirmations', 'count' => 3, 'children' => [
        ['kind' => 'activity', 'headline' => 'First confirmation'],
        ['kind' => 'activity', 'headline' => 'Second confirmation'],
    ]];
    $html = Blade::render('<x-storyfeed::feed :items="[$item]" :interactive="false" :collapsed="true" />', compact('item'));
    expect($html)->toContain('First confirmation', 'Second confirmation', '…and 1 more not shown', 'sf-children mt-3 hidden print:block')->not->toContain('<details', '<summary');
    expect(Blade::render('<x-storyfeed::feed :items="[$item]" :interactive="false" :collapsed="false" />', compact('item')))->toContain('First confirmation')->not->toContain('hidden print:block');
    expect(Blade::render('<x-storyfeed::feed :items="[$item]" :collapsed="true" />', compact('item')))->toContain('<details', '<summary', 'print:[&::details-content]:block', 'First confirmation')->not->toContain('hidden print:block');
});

it('renders groups without retired fields and ignores unknown extra keys', function () {
    foreach ([['headline_template' => ':count updates'], ['headline' => 'Updates'], []] as $headline) {
        $item = [...$headline, 'kind' => 'group', 'axis' => 'repeat', 'count' => 3, 'children' => [
            ['kind' => 'activity', 'headline' => 'Child update'],
        ]];
        $template = '<x-storyfeed::feed :items="[$item]" :grouped="false" />';
        $html = Blade::render($template, compact('item'));
        expect($html)->toContain('Child update', '…and 2 more not shown')
            ->and($item)->not->toHaveKeys(['phrases', 'phrases_truncated', 'period']);
        $item += ['phrases' => [['headline_template' => 'Retired sentence', 'count' => 3]], 'phrases_truncated' => true, 'period' => 'day', 'future_field' => ['unknown' => true]];
        expect(Blade::render($template, compact('item')))->toBe($html);
    }
});

it('renders a footnote-only media object as a line', function ($footnote, $entityUrl, $href) {
    $body = ['$body' => 'Storyfeed/Body/MediaObject', '$v' => 2, 'footnote' => $footnote];
    $entity = Entity::of(['label' => 'Discussion', 'url' => $entityUrl]);
    $html = Blade::render('<x-storyfeed::body.media-object :body="$body" :entity="$entity" />', compact('body', 'entity'));

    expect($html)->toContain('sf-media-object__footnote mt-0.5 mb-0 text-xs leading-[1.6] text-muted-foreground', 'See full discussion')
        ->not->toContain('<div', 'border-border', 'bg-muted', 'p-3');
    if ($href) {
        expect($html)->toContain('href="'.$href.'"');
    } else {
        expect($html)->not->toContain('<a');
    }
})->with([
    'explicit link' => [['label' => 'See full discussion', 'href' => '/discussion'], '/current', '/discussion'],
    'resolved link' => [['label' => 'See full discussion', 'href' => null], '/current', '/current'],
    'unresolved link' => [['label' => 'See full discussion', 'href' => null], null, null],
    'plain text' => ['See full discussion', '/current', null],
]);

it('keeps content and footnote together inside the media object card', function () {
    $body = ['$body' => 'Storyfeed/Body/MediaObject', '$v' => 2, 'content' => 'Discussion summary', 'footnote' => ['label' => 'Read more', 'href' => '/discussion']];
    $html = Blade::render('<x-storyfeed::body.media-object :body="$body" />', compact('body'));
    expect($html)->toContain('sf-media-object mt-1.5 flex min-w-0 max-w-128 flex-wrap items-start gap-3 rounded-lg border border-border bg-muted p-3', 'sf-media-object__content', 'Discussion summary', 'sf-media-object__footnote', 'href="/discussion"');
});

it('sizes all three kits on the rem scale, with no pixel arbitrary values', function () {
    $files = collect(['resources/views', 'resources/js'])
        ->flatMap(fn (string $directory) => iterator_to_array(new RecursiveIteratorIterator(new RecursiveDirectoryIterator(dirname(__DIR__, 2).'/'.$directory, FilesystemIterator::SKIP_DOTS))))
        ->filter(fn (SplFileInfo $file) => preg_match('/\.(php|vue|tsx?)$/', $file->getFilename()) === 1);

    expect($files)->not->toBeEmpty()
        ->and($files->filter(fn (SplFileInfo $file) => preg_match('/[a-z:-]+-\[[0-9.]+px\]/', (string) file_get_contents($file->getPathname())) === 1)->keys()->all())->toBe([]);

    expect(file_get_contents(dirname(__DIR__, 2).'/resources/views/components/feed.blade.php'))->toContain('[--spacing:calc(var(--sf-font-size,1rem)/4)]', '[--text-base:var(--sf-font-size,1rem)]', 'text-base leading-[1.6]');

    // ui#23: every row sets its own size from --sf-font-size, so nothing inherits the host page's base, and no body draws at the headline's size.
    foreach (['resources/views/components/activity.blade.php', 'resources/views/components/group.blade.php', 'resources/js/vue/FeedItem.vue', 'resources/js/vue/FeedGroup.vue', 'resources/js/react/FeedItem.tsx', 'resources/js/react/FeedGroup.tsx'] as $row) {
        expect(file_get_contents(dirname(__DIR__, 2).'/'.$row))->toContain('[--text-sm:calc(var(--sf-font-size,1rem)*0.875)] [--text-base:var(--sf-font-size,1rem)]', '[--sf-badge-face:--spacing(4.5)] text-base leading-[1.6]');
    }
    $bodies = collect([...glob(dirname(__DIR__, 2).'/resources/views/components/body/*.blade.php'), ...glob(dirname(__DIR__, 2).'/resources/js/vue/body/*.vue'), dirname(__DIR__, 2).'/resources/js/react/body/index.tsx']);
    expect($bodies->filter(fn (string $file) => preg_match('/\btext-base\b/', (string) file_get_contents($file)) === 1)->map(fn ($file) => basename($file))->values()->all())->toBe([]);
});

it('wraps a long headline inside its column instead of running off a narrow feed', function (string $kind) {
    $item = ['kind' => $kind, 'headline' => 'IMG_20260814_120000_HDR_PANORAMA_KITCHEN.jpg'];
    expect(Blade::render('<x-storyfeed::feed :items="[$item]" :grouped="false" />', compact('item')))
        ->toMatch('/class="sf-headline[^"]*\[overflow-wrap:anywhere\]/');
})->with(['activity', 'group']);

it('draws several actors as a diagonal pair whose front face keeps the verb badge', function () {
    $item = ['kind' => 'group', 'headline' => 'Ana, Ben and Cara posted', 'count' => 3, 'children' => [], 'glyph' => 'file-up',
        'sample' => ['actors' => [['id' => 'a', 'label' => 'Ana'], ['id' => 'b', 'label' => 'Ben'], ['id' => 'c', 'label' => 'Cara'], ['id' => 'd', 'label' => 'Dev']]]];
    $rail = explode('class="sf-body', Blade::render('<x-storyfeed::feed :items="[$item]" rail="actor" />', compact('item')))[0];
    preg_match_all('/aria-label="([^"]+)"[^>]*sf-avatar--pair[^>]*>\s*([^<\s]*)\s*</', $rail, $faces, PREG_SET_ORDER);
    // At most two faces, the first actor in front at the bottom-right, one letter each (ui#25).
    expect(array_map(fn ($face) => [$face[1], $face[2]], $faces))->toBe([['Ana', 'A'], ['Ben', 'B']])
        ->and(explode('sf-avatars__face', $rail)[1])->toContain('right-0 bottom-0 z-10')
        ->and(substr_count($rail, 'sf-badge absolute'))->toBe(1)
        ->and($rail)->toContain('@container/pair', '[&:has(>.sf-avatars)>.sf-badge]:[--sf-badge:--spacing(2.75)]')->not->toContain('sf-avatar--badge');
    // A face badge never stands for several actors.
    $rail = explode('class="sf-body', Blade::render('<x-storyfeed::feed :items="[$item]" rail="activity" />', compact('item')))[0];
    expect($rail)->not->toContain('sf-avatar--badge');
});

it('keeps a group\'s rail faces and strip in place when it expands', function (bool $interactive) {
    $photo = fn (string $src) => ['type' => 'photo', 'id' => $src, 'label' => 'Photo', 'url' => '/photos'.$src, 'body' => [['$body' => 'Storyfeed/Body/Image', 'image' => 'preview']], 'media' => ['preview' => ['src' => $src]]];
    $item = ['kind' => 'group', 'headline' => 'Ana and Ben uploaded photos', 'count' => 2, 'glyph' => 'file-up',
        'sample' => ['actors' => [['id' => 'ana', 'label' => 'Ana'], ['id' => 'ben', 'label' => 'Ben']]],
        'children' => [['kind' => 'activity', 'headline' => 'Ana uploaded a photo', 'object' => $photo('/one.jpg')], ['kind' => 'activity', 'headline' => 'Ben uploaded a photo', 'object' => $photo('/two.jpg')]]];
    $html = Blade::render('<x-storyfeed::feed :items="[$item]" rail="actor" :interactive="$interactive" :collapsed="false" />', compact('item', 'interactive'));
    $head = explode('class="sf-children', $html)[0];
    expect(substr_count($head, 'sf-avatar--pair'))->toBe(2)
        ->and($head)->toContain('sf-media-strip', 'src="/one.jpg"', 'src="/two.jpg"')
        ->not->toContain(':has(>.sf-disclosure[open])>.sf-media-strip]:hidden');
    expect($html)->toContain('Ana uploaded a photo', 'Ben uploaded a photo');
})->with(['interactive' => true, 'static' => false]);
