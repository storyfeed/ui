<?php

use Illuminate\Pagination\Cursor;
use Illuminate\Pagination\CursorPaginator;
use Illuminate\Support\Facades\Blade;
use Storyfeed\Facades\Story;
use Storyfeed\Facades\Storyfeed;
use Storyfeed\Support\Entity;
use Storyfeed\Ui\Support\Page;
use Storyfeed\Ui\Tests\Fixtures\Order;
use Storyfeed\Ui\Tests\Fixtures\User;

/*
 * Every component rendered against pages core really produces: activities
 * are published through core and read back, so the kit is tested against the
 * payload as it is, not as a fixture remembers it.
 */

beforeEach(function () {
    $this->dana = User::create(['name' => 'Dana', 'email' => 'dana@example.com']);

    Story::for(Order::class)->verb('place')->headline(':actor placed :object')->icon('shopping-bag')->intent('success');
    Story::for(Order::class)->verb('ship')->headline(':actor shipped :object');
});

it('draws an activity row: glyph, linked headline and time', function () {
    Storyfeed::activity('place', Order::create(['number' => '1042']))->by($this->dana)->publish();

    $html = render_feed();

    expect($html)
        ->toContain('<div data-sf-feed> <div role="feed"> <article data-sf-row>')
        ->toContain('<span data-sf-intent="success" data-sf-glyph="shopping-bag" aria-hidden="true"> <svg')
        ->toContain('<span data-sf-headline><a data-sf-subject href="/users/1">Dana</a> placed <a data-sf-subject href="/orders/1" target="_blank">Order #1042</a></span>')
        ->toContain('</span> </div> <div> <time datetime="2026-09-25T12:00:00+00:00" title="Friday, 25 September 2026, 12:00:00 PM">just now</time>')
        // The last row on the last page ends the rail.
        ->not->toContain('<div aria-hidden="true"></div>')
        ->not->toContain('<nav');
});

it('lands attributes on the feed root', function () {
    Storyfeed::activity('place', Order::create(['number' => '1']))->by($this->dana)->publish();

    expect(render_feed(attributes: 'class="my-feed" id="activity"'))->toStartWith('<div data-sf-feed id="activity">');
});

it('draws the blank disc for a verb with no glyph', function () {
    Storyfeed::anonymous()->action('ship', Order::create(['number' => '7']))->publish();

    expect(render_feed())
        ->toContain('<span aria-hidden="true"> </span>')
        ->not->toContain('data-sf-intent');
});

it('reads a missing actor with core\'s placeholder', function () {
    Storyfeed::anonymous()->action('place', Order::create(['number' => '9']))->publish();

    // Before storyfeed/storyfeed#98, core draws the empty role's words itself, so they stay bare.
    expect(render_feed())->toContain(method_exists(Entity::class, 'isAbsent')
        ? '<span data-sf-headline><span data-sf-subject>Someone</span> placed <a data-sf-subject href="/orders/1" target="_blank">Order #9</a></span>'
        : '<span data-sf-headline>Someone placed <a data-sf-subject href="/orders/1" target="_blank">Order #9</a></span>');
});

it('draws an anonymous actor as an actor, muted, never italic', function () {
    Storyfeed::anonymous()->action('place', Order::create(['number' => '9']))->publish();
    Storyfeed::anonymous()->action('place', Order::create(['number' => '10']))->publish();

    $single = Blade::render('<x-storyfeed::feed :page="$page" :grouped="false" />', ['page' => Storyfeed::feed()->get()]);
    $group = Blade::render('<x-storyfeed::feed :page="$page" />', ['page' => Storyfeed::feed()->live()->get()]);

    // A core before storyfeed/storyfeed#98 draws a single row's empty role itself; the group headline is the kit's own.
    foreach (method_exists(Entity::class, 'isAbsent') ? [$single, $group] : [$group] as $html) {
        expect($html)->toContain('<span data-sf-subject class="sf-entity sf-entity--anonymous font-medium text-muted-foreground">Someone</span>')
            ->not->toMatch('/<span[^>]*italic[^>]*>Someone</');
    }
});

it('draws a deleted model as a tombstone, never a link', function () {
    $order = Order::create(['number' => '5']);
    Storyfeed::activity('place', $order)->by($this->dana)->publish();
    $order->delete();

    expect(render_feed())
        ->toContain('placed <span data-sf-subject>a removed order</span>')
        ->not->toContain('href="/orders/');
});

it('leaves historical thread data to the application', function () {
    Storyfeed::activity('place', Order::create(['number' => '3']))->by($this->dana)
        ->data(['$thread' => ['$v' => 1, 'text' => 'Historical quote', 'replies' => 3]])
        ->publish();

    expect(render_feed())->toContain('placed')->not->toContain('Historical quote', '3 replies');
});

it('draws a repeat group with its members behind a disclosure', function () {
    config(['storyfeed.grouping.children_limit' => 2]);

    foreach (range(1, 3) as $i) {
        Storyfeed::activity('place', Order::create(['number' => "G{$i}"]))->by($this->dana)->publish();
    }

    $page = Storyfeed::feed()->live()->get();
    $group = page_items($page)->sole();

    expect($group->isGroup())->toBeTrue();

    $html = render_feed($page);

    expect($html)
        ->toContain('<span data-sf-headline>'.structural_html($group->headline()->toHtml(fn ($entity) => trim(view('storyfeed::entity', ['entity' => $entity, 'subject' => true])->render()))).'</span>')
        ->toContain('<summary data-sf-toggle> <span>Show all 3</span><span>Show less</span> </summary>')
        ->toContain('<p>…and 1 more not shown</p>')
        ->and(substr_count($html, '<article data-sf-row>'))->toBe(3);
});

it('opens a group with no headline on its members', function () {
    foreach (range(1, 2) as $i) {
        Storyfeed::activity('archive', Order::create(['number' => "U{$i}"]))->by($this->dana)->publish();
    }

    $page = Storyfeed::feed()->live()->get();
    $group = page_items($page)->sole();

    expect($group->headline()->isFallback())->toBeTrue()
        ->and(render_feed($page))
        ->toContain('<span data-sf-headline>2 activities</span>')
        ->toContain('<details open ontoggle=');
});

it('links to older activity with the next cursor, and not from the last page', function () {
    Storyfeed::activity('place', Order::create(['number' => 'A']))->by($this->dana)->publishedAt(now()->subHour())->publish();
    Storyfeed::activity('ship', Order::create(['number' => 'B']))->by($this->dana)->publish();

    // Laravel's cursor paginator, on every core; its cursor is an object the kit encodes.
    $first = Storyfeed::feed()->cursorPaginate(1);
    $cursor = $first->nextCursor()?->encode();
    $html = render_feed($first);

    expect($cursor)->not->toBeNull()
        ->and($html)->toContain('<nav aria-label="Pagination Navigation"> <div> <div aria-hidden="true"></div> </div> '
            .'<a href="http://localhost/?cursor='.urlencode($cursor).'" rel="next">Older activity</a> </nav>')
        // More pages follow, so the row keeps its rail.
        ->toContain('<div aria-hidden="true"></div>')
        ->and(render_feed(Storyfeed::feed()->limit(1)->cursor($cursor)->get()))
        ->not->toContain('<nav');
});

it('says so when the page is empty, in words the app can replace', function () {
    expect(render_feed())->toBe('<div data-sf-feed> <div>No activity yet.</div> </div>')
        ->and(render_blade('<x-storyfeed::feed :page="$page"><x-slot:empty>Nothing yet today.</x-slot:empty></x-storyfeed::feed>', ['page' => Storyfeed::feed()->get()]))
        ->toContain('<div>Nothing yet today.</div>');
});

it('renders each part on its own', function () {
    Storyfeed::activity('place', Order::create(['number' => '1']))->by($this->dana)->publish();

    $item = Storyfeed::feed()->get()->collect()->sole();

    expect(render_blade('<x-storyfeed::item :item="$item" last />', ['item' => $item]))->toStartWith('<article data-sf-row>')
        ->and(render_blade('<x-storyfeed::activity :activity="$item" />', ['item' => $item]))->toStartWith('<article data-sf-row>')
        ->and(render_blade('<x-storyfeed::headline :headline="$item->headline()" />', ['item' => $item]))->toStartWith('<span data-sf-headline><a data-sf-subject')
        ->and(render_blade('<x-storyfeed::time :at="$item->publishedAt()" />', ['item' => $item]))->toEndWith('>just now</time>')
        ->and(render_blade('<x-storyfeed::glyph :glyph="$item->glyph()" :intent="$item->intent()" />', ['item' => $item]))->toStartWith('<span data-sf-intent="success"')
        ->and(render_blade('<x-storyfeed::pager :cursor="null" />'))->toBe('');
});

it('merges caller classes and attributes without depending on kit utilities', function () {
    $html = Blade::render('<x-storyfeed::feed :page="$page" class="my-feed" id="activity" />', ['page' => Storyfeed::feed()->get()]);
    $document = new DOMDocument;
    $document->loadHTML($html);
    $root = $document->getElementById('activity');

    expect($root)->not->toBeNull()
        ->and(explode(' ', $root->getAttribute('class')))->toContain('my-feed');
});

it('reads every page shape core returns, and its JSON with the nodes under data or items', function () {
    Storyfeed::activity('place', Order::create(['number' => 'A']))->by($this->dana)->publishedAt(now()->subHour())->publish();
    Storyfeed::activity('ship', Order::create(['number' => 'B']))->by($this->dana)->publish();

    $rows = fn (string $html) => substr_count($html, '<article data-sf-row>');
    $paginator = Storyfeed::feed()->cursorPaginate(1);
    $cursor = $paginator->nextCursor()?->encode();
    $nodes = json_decode((string) json_encode(Page::read(Storyfeed::feed()->get())['items']), true);

    // What get() returns: a FeedPage before storyfeed/storyfeed#95, a collection after; then the paginator.
    expect($rows(render_feed(Storyfeed::feed()->get())))->toBe(2)
        ->and($rows($html = render_feed($paginator)))->toBe(1)->and($html)->toContain('cursor='.urlencode((string) $cursor))
        // Decoded JSON: Laravel's paginator (`data`, #95), the old envelope (`items`), and get()'s plain list.
        ->and($rows($html = render_feed(['data' => array_slice($nodes, 0, 1), 'next_cursor' => 'next-page'])))->toBe(1)->and($html)->toContain('cursor=next-page')
        ->and($rows($html = render_feed(['items' => $nodes, 'next_cursor' => null])))->toBe(2)->and($html)->not->toContain('<nav')
        ->and($rows(render_feed($nodes)))->toBe(2)
        // A Laravel paginator built by hand, and a Cursor passed to next-cursor, read the same way.
        ->and($rows(render_feed(new CursorPaginator($nodes, 5))))->toBe(2)
        ->and(render_blade('<x-storyfeed::feed :items="$items" :next-cursor="$cursor" />', ['items' => $nodes, 'cursor' => new Cursor(['id' => 7])]))
        ->toContain('cursor='.urlencode((new Cursor(['id' => 7]))->encode()));
});

it('draws a dateless entry with no time and no day of its own (storyfeed/storyfeed#127)', function () {
    Storyfeed::activity('place', Order::create(['number' => 'A']))->by($this->dana)->publish();
    $node = json_decode((string) json_encode(Page::read(Storyfeed::feed()->get())['items']), true)[0];
    $at = fn (string $id, ?string $published) => [...$node, 'id' => $id, 'published_at' => $published];
    $grouped = fn (array $nodes) => render_blade('<x-storyfeed::feed :page="$page" />', ['page' => $nodes]);

    expect($html = render_feed([$at('a', null)]))->toContain('Order #A')->not->toContain('<time')
        // A dateless entry neither starts a day nor ends one: the next dated entry on that day draws no second heading.
        ->and(substr_count($grouped([$at('a', '2026-09-25T12:00:00+00:00'), $at('b', null), $at('c', '2026-09-25T10:00:00+00:00'), $at('d', '2026-09-23T10:00:00+00:00')]), '<h2 data-sf-day>'))->toBe(2)
        ->and(substr_count($grouped([$at('b', null), $at('a', '2026-09-25T12:00:00+00:00')]), '<h2 data-sf-day>'))->toBe(1)
        ->and(substr_count($grouped([$at('b', null)]), '<h2 data-sf-day>'))->toBe(0);
});

it('leaves a null verb out of the fallback headline (storyfeed/storyfeed#127)', function () {
    Storyfeed::anonymous()->action('place', Order::create(['number' => '9']))->publish();
    $node = json_decode((string) json_encode(Page::read(Storyfeed::feed()->get())['items']), true)[0];

    expect(render_feed([[...$node, 'verb' => null, 'headline_template' => null, 'headline' => null]]))->not->toContain('null')
        ->and(render_feed([[...$node, 'verb' => null, 'headline_template' => null, 'headline' => 'Imported from the archive']]))->toContain('<span data-sf-headline>Imported from the archive</span>');
});

it('marks the feed root and CTA action with stable data hooks', function () {
    expect(render_feed())->toStartWith('<div data-sf-feed>');

    $cta = fn (array $body) => Blade::render('<x-storyfeed::body.call-to-action :body="$body" :entity="$entity" />', ['body' => $body, 'entity' => Entity::of(['label' => 'E', 'url' => '/e', 'link' => ['href' => '/e']])]);
    $action = ['label' => 'Go', 'link' => ['href' => '/go', 'modal' => false, 'attributes' => []]];

    expect($cta(['subject' => 'S', 'action' => $action]))->toMatch('/<a href="\/go" data-sf-cta-action [^>]*class="sf-cta__action/')
        ->and($cta(['action' => $action]))->toMatch('/<a href="\/go" data-sf-cta-action [^>]*class="sf-cta__action/');
});

it('marks rows, rails, bodies, headlines, subjects, toggles, members, strips, days and avatars with stable hooks', function () {
    $person = fn (int $n) => ['type' => 'person', 'id' => "p{$n}", 'label' => "Person {$n}", 'url' => "/people/{$n}", 'media' => null];
    $members = array_map(fn (int $n) => ['kind' => 'activity', 'id' => "visit-{$n}", 'headline_template' => ':actor checked in', 'actor' => $person($n), 'published_at' => '2026-09-25T12:00:00Z'], range(1, 12));
    $items = [
        ['kind' => 'group', 'id' => 'crowd', 'headline_template' => ':actors checked in', 'count' => 12, 'children' => $members, 'sample' => ['actors' => array_map($person, range(1, 3))], 'distinct' => ['actors' => 12], 'published_at' => '2026-09-25T12:00:00Z'],
        ['kind' => 'activity', 'id' => 'older', 'headline_template' => ':actor checked in', 'actor' => $person(20), 'published_at' => '2026-09-20T12:00:00Z'],
    ];
    $html = Blade::render('<x-storyfeed::feed :items="$items" next-cursor="next" />', ['items' => $items]);

    preg_match_all('/<[a-zA-Z](?:[^>"]|"[^"]*")*>/', (string) preg_replace('/<script>.*?<\/script>/s', '', $html), $found);
    $tags = array_map(fn (string $tag) => ['tag' => $tag, 'classes' => preg_match('/ class="([^"]*)"/', $tag, $m) ? preg_split('/\s+/', $m[1]) : []], $found[0]);
    $is = fn (string ...$names) => fn (array $t) => array_intersect($names, $t['classes']) !== [];
    $rows = count(array_filter($tags, fn ($t) => in_array('sf-row', $t['classes'], true) && ! in_array('sf-divider', $t['classes'], true))) - 1;
    $expected = [
        'data-sf-row' => [$is('sf-row'), $rows],
        'data-sf-rail' => [$is('sf-rail'), $rows],
        'data-sf-body' => [$is('sf-body')],
        'data-sf-headline' => [$is('sf-headline')],
        'data-sf-toggle' => [fn ($t) => $is('sf-toggle')($t) || (str_starts_with($t['tag'], '<button') && $is('sf-actor-strip__more', 'sf-media-strip__more')($t))],
        'data-sf-children' => [$is('sf-children')],
        'data-sf-strip' => [$is('sf-actor-strip', 'sf-media-strip')],
        'data-sf-subject' => [$is('sf-entity')],
        'data-sf-day' => [$is('sf-day')],
        'data-sf-avatar' => [$is('sf-avatar')],
    ];
    foreach ($expected as $hook => $spec) {
        [$element, $count] = [$spec[0], $spec[1] ?? null];
        $marked = array_filter($tags, fn ($t) => preg_match('/\s'.$hook.'(?=[\s>=\/])/', $t['tag']) === 1);
        expect($marked)->not->toBeEmpty("{$hook} is drawn")
            ->and(count($marked))->toBe($count ?? count(array_filter($tags, $element)), "{$hook} marks every element it names");
        foreach ($marked as $t) {
            expect($element($t))->toBeTrue("{$hook} marks only its element: {$t['tag']}")
                ->and(array_intersect(['sf-divider', 'sf-more'], $t['classes']))->toBe([]);
        }
    }
});
