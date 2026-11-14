<?php

use Storyfeed\Facades\Story;
use Storyfeed\Facades\Storyfeed;
use Storyfeed\Ui\Support\Page;
use Storyfeed\Ui\Tests\Fixtures\Order;
use Storyfeed\Ui\Tests\Fixtures\User;

/*
 * Core 0.26 (storyfeed/storyfeed#242) adds a page-level `media` map, keyed by
 * the `media_ref` each entity carries, and an `inline_media` switch that drops
 * the entities' own `link` and `media`. The kit reads the map first.
 */

beforeEach(function () {
    Story::for(Order::class)->verb('place')->headline(':actor placed :object');
    Storyfeed::activity('place', Order::create(['number' => '1042']))->by(User::create(['name' => 'Dana', 'email' => 'dana@example.com']))->publish();
});

/**
 * Core's page JSON, with the actor's `{link, media}` moved into the map under
 * its ref and pointed somewhere only the map knows. On core 0.26 the map and
 * ref are core's own; on older cores the test adds them in core's shape.
 *
 * @return array<string, mixed>
 */
function mapped_page(bool $inline): array
{
    $page = json_decode((string) json_encode(Storyfeed::feed()->cursorPaginate(10)), true);
    $actor = &$page['data'][0]['actor'];
    $ref = $actor['media_ref'] ?? 'mtest';
    $actor['media_ref'] = $ref;
    $map = is_array($page['media'] ?? null) && $page['media'] !== [] ? $page['media'] : [];
    $map[$ref] = ['link' => [...($actor['link'] ?? []), 'href' => '/from-map'], 'media' => $actor['media'] ?? null];
    $page['media'] = $map;

    if (! $inline) {
        unset($actor['link'], $actor['media']);
    }

    return $page;
}

it('reads an entity\'s link from the page\'s media map, with inline_media on or off', function (bool $inline) {
    $page = mapped_page($inline);

    expect(Page::read($page)['items'][0]['actor']['link']['href'])->toBe('/from-map')
        ->and(render_feed($page))->toContain('<a data-sf-subject href="/from-map">Dana</a>');
})->with(['inline_media on' => true, 'inline_media off' => false]);

it('treats a missing, empty or [] map as no map and keeps the inline copies', function (mixed $media) {
    $page = json_decode((string) json_encode(Storyfeed::feed()->cursorPaginate(10)), true);
    $page['data'][0]['actor']['media_ref'] = 'mtest';
    if ($media === 'missing') {
        unset($page['media']);
    } else {
        $page['media'] = $media;
    }

    expect(Page::mediaMap($page))->toBe([])
        ->and(render_feed($page))->toContain('<a data-sf-subject href="/users/1">Dana</a>');
})->with(['missing' => 'missing', 'empty list' => [[]], 'null' => null]);

it('falls back to the inline copy when the map has no entry for the ref', function () {
    $page = mapped_page(true);
    $page['data'][0]['actor']['media_ref'] = 'mother';

    expect(render_feed($page))->toContain('<a data-sf-subject href="/users/1">Dana</a>');
});

it('reads core\'s own paginator map when inline_media is off', function () {
    config(['storyfeed.payload.inline_media' => false]);
    $paginator = Storyfeed::feed()->cursorPaginate(10);
    if (! method_exists($paginator, 'media')) {
        $this->markTestSkipped('Needs storyfeed/storyfeed 0.26.');
    }
    $json = json_decode((string) json_encode($paginator), true);

    expect($json['data'][0]['actor'])->not->toHaveKey('link')
        ->and(Page::read($paginator)['items'][0]['actor']['link']['href'])->toBe('/users/1')
        ->and(render_feed($paginator))->toContain('<a data-sf-subject href="/users/1">Dana</a>')
        ->and(render_feed($json))->toContain('<a data-sf-subject href="/users/1">Dana</a>');
});
