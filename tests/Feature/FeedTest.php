<?php

use Illuminate\Support\Facades\Blade;
use Storyfeed\Facades\Story;
use Storyfeed\Facades\Storyfeed;
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
        ->toContain('<div> <div role="feed"> <article>')
        ->toContain('<span data-sf-intent="success" data-sf-glyph="shopping-bag" aria-hidden="true"> <svg')
        ->toContain('<span><a href="/users/1">Dana</a> placed <a href="/orders/1" target="_blank">Order #1042</a></span>')
        ->toContain('</span> </div> <div> <time datetime="2026-09-25T12:00:00+00:00" title="Friday, 25 September 2026, 12:00:00 PM">just now</time>')
        // The last row on the last page ends the rail.
        ->not->toContain('<div aria-hidden="true"></div>')
        ->not->toContain('<nav');
});

it('lands attributes on the feed root', function () {
    Storyfeed::activity('place', Order::create(['number' => '1']))->by($this->dana)->publish();

    expect(render_feed(attributes: 'class="my-feed" id="activity"'))->toStartWith('<div id="activity">');
});

it('draws the blank disc for a verb with no glyph', function () {
    Storyfeed::anonymous()->action('ship', Order::create(['number' => '7']))->publish();

    expect(render_feed())
        ->toContain('<span aria-hidden="true"> </span>')
        ->not->toContain('data-sf-intent');
});

it('reads a missing actor with core\'s placeholder', function () {
    Storyfeed::anonymous()->action('place', Order::create(['number' => '9']))->publish();

    expect(render_feed())->toContain('<span>Someone placed <a href="/orders/1" target="_blank">Order #9</a></span>');
});

it('draws a deleted model as a tombstone, never a link', function () {
    $order = Order::create(['number' => '5']);
    Storyfeed::activity('place', $order)->by($this->dana)->publish();
    $order->delete();

    expect(render_feed())
        ->toContain('placed <span>a removed order</span>')
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
    $group = $page->collect()->sole();

    expect($group->isGroup())->toBeTrue();

    $html = render_feed($page);

    expect($html)
        ->toContain('<span>'.structural_html($group->headline()->toHtml(fn ($entity) => trim(view('storyfeed::entity', ['entity' => $entity])->render()))).'</span>')
        ->toContain('<summary> <span>Show all 3</span><span>Show less</span> </summary>')
        ->toContain('<p>…and 1 more not shown</p>')
        ->and(substr_count($html, '<article>'))->toBe(3);
});

it('opens a group with no headline on its members', function () {
    foreach (range(1, 2) as $i) {
        Storyfeed::activity('archive', Order::create(['number' => "U{$i}"]))->by($this->dana)->publish();
    }

    $page = Storyfeed::feed()->live()->get();
    $group = $page->collect()->sole();

    expect($group->headline()->isFallback())->toBeTrue()
        ->and(render_feed($page))
        ->toContain('<span>2 activities</span>')
        ->toContain('<details open >');
});

it('links to older activity with the next cursor, and not from the last page', function () {
    Storyfeed::activity('place', Order::create(['number' => 'A']))->by($this->dana)->publishedAt(now()->subHour())->publish();
    Storyfeed::activity('ship', Order::create(['number' => 'B']))->by($this->dana)->publish();

    $first = Storyfeed::feed()->limit(1)->get();
    $html = render_feed($first);

    expect($first->nextCursor())->not->toBeNull()
        ->and($html)->toContain('<nav aria-label="Pagination Navigation"> <div> <div aria-hidden="true"></div> </div> '
            .'<a href="http://localhost/?cursor='.urlencode($first->nextCursor()).'" rel="next">Older activity</a> </nav>')
        // More pages follow, so the row keeps its rail.
        ->toContain('<div aria-hidden="true"></div>')
        ->and(render_feed(Storyfeed::feed()->limit(1)->cursor($first->nextCursor())->get()))
        ->not->toContain('<nav');
});

it('says so when the page is empty, in words the app can replace', function () {
    expect(render_feed())->toBe('<div> <div>No activity yet.</div> </div>')
        ->and(render_blade('<x-storyfeed::feed :page="$page"><x-slot:empty>Nothing yet today.</x-slot:empty></x-storyfeed::feed>', ['page' => Storyfeed::feed()->get()]))
        ->toContain('<div>Nothing yet today.</div>');
});

it('renders each part on its own', function () {
    Storyfeed::activity('place', Order::create(['number' => '1']))->by($this->dana)->publish();

    $item = Storyfeed::feed()->get()->collect()->sole();

    expect(render_blade('<x-storyfeed::item :item="$item" last />', ['item' => $item]))->toStartWith('<article>')
        ->and(render_blade('<x-storyfeed::activity :activity="$item" />', ['item' => $item]))->toStartWith('<article>')
        ->and(render_blade('<x-storyfeed::headline :headline="$item->headline()" />', ['item' => $item]))->toStartWith('<span><a')
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
