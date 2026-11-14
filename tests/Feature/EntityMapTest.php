<?php

use Storyfeed\Facades\Story;
use Storyfeed\Facades\Storyfeed;
use Storyfeed\Ui\Support\Page;
use Storyfeed\Ui\Tests\Fixtures\Order;
use Storyfeed\Ui\Tests\Fixtures\User;

/*
 * Core 0.27 (storyfeed/storyfeed#249) adds a page-level `entities` map, keyed
 * by the `entity_ref` each entity carries, and an `inline_entities` switch
 * that sends paginated entities as `{type, id, entity_ref}` stubs. The kit
 * reads the map first, then the media map.
 */

beforeEach(function () {
    Story::for(Order::class)->verb('place')->headline(':actor placed :object');
    Storyfeed::activity('place', Order::create(['number' => '1042']))->by(User::create(['name' => 'Dana', 'email' => 'dana@example.com']))->publish();
});

/**
 * Core's page JSON with the actor moved into the map under its ref, pointed
 * somewhere only the map knows. With inline_entities off the actor is a stub.
 *
 * @return array<string, mixed>
 */
function entity_page(bool $inline): array
{
    $page = json_decode((string) json_encode(Storyfeed::feed()->cursorPaginate(10)), true);
    $actor = &$page['data'][0]['actor'];
    $ref = $actor['entity_ref'] ?? 'etest';
    $actor['entity_ref'] = $ref;
    $map = is_array($page['entities'] ?? null) && $page['entities'] !== [] ? $page['entities'] : [];
    $map[$ref] = [...$actor, 'link' => [...($actor['link'] ?? []), 'href' => '/from-map']];
    $page['entities'] = $map;

    if (! $inline) {
        $actor = ['type' => $actor['type'], 'id' => $actor['id'], 'entity_ref' => $ref];
    }

    return $page;
}

it('reads an entity from the page\'s entities map, with inline_entities on or off', function (bool $inline) {
    $page = entity_page($inline);

    expect(Page::read($page)['items'][0]['actor']['link']['href'])->toBe('/from-map')
        ->and(render_feed($page))->toContain('<a data-sf-subject href="/from-map">Dana</a>');
})->with(['inline_entities on' => true, 'inline_entities off' => false]);

it('treats a missing, empty or [] entities map as no map and keeps the inline copy', function (mixed $entities) {
    $page = json_decode((string) json_encode(Storyfeed::feed()->cursorPaginate(10)), true);
    $page['data'][0]['actor']['entity_ref'] = 'etest';
    if ($entities === 'missing') {
        unset($page['entities']);
    } else {
        $page['entities'] = $entities;
    }

    expect(Page::entityMap($page))->toBe([])
        ->and(render_feed($page))->toContain('<a data-sf-subject href="/users/1">Dana</a>');
})->with(['missing' => 'missing', 'empty list' => [[]], 'null' => null]);

it('falls back to the inline copy when the map has no entry for the ref', function () {
    $page = entity_page(true);
    $page['data'][0]['actor']['entity_ref'] = 'eother';

    expect(render_feed($page))->toContain('<a data-sf-subject href="/users/1">Dana</a>');
});

it('reads a map entry\'s link and media from the media map by media_ref', function () {
    $entry = ['type' => 'user', 'id' => '1', 'label' => 'Dana', 'entity_ref' => 'e1', 'media_ref' => 'm1'];
    $resolved = Page::resolve(['actor' => ['type' => 'user', 'id' => '1', 'entity_ref' => 'e1']], ['m1' => ['link' => ['href' => '/via-media'], 'media' => null]], ['e1' => $entry]);

    expect($resolved['actor']['label'])->toBe('Dana')
        ->and($resolved['actor']['link']['href'])->toBe('/via-media');
});

it('resolves stubs at every depth of a group', function () {
    $stub = ['type' => 'user', 'id' => '1', 'entity_ref' => 'e1'];
    $entity = ['type' => 'user', 'id' => '1', 'label' => 'Dana', 'entity_ref' => 'e1', 'link' => ['href' => '/users/1'], 'media' => null];
    $group = ['kind' => 'group', 'actor' => $stub, 'object' => $stub, 'sample' => ['actors' => [$stub], 'featured' => [$stub]], 'children' => [['kind' => 'activity', 'actor' => $stub]]];

    $item = Page::read(['data' => [$group], 'next_cursor' => null, 'entities' => ['e1' => $entity], 'media' => []])['items'][0];

    foreach ([$item['actor'], $item['object'], $item['sample']['actors'][0], $item['sample']['featured'][0], $item['children'][0]['actor']] as $resolved) {
        expect($resolved['label'])->toBe('Dana')->and($resolved['link']['href'])->toBe('/users/1');
    }
});

it('reads core\'s own paginator map when inline_entities is off', function () {
    config(['storyfeed.payload.inline_entities' => false]);
    $paginator = Storyfeed::feed()->cursorPaginate(10);
    if (! method_exists($paginator, 'entities')) {
        $this->markTestSkipped('Needs storyfeed/storyfeed 0.27.');
    }
    $json = json_decode((string) json_encode($paginator), true);

    expect($json['data'][0]['actor'])->not->toHaveKey('label')
        ->and(Page::read($paginator)['items'][0]['actor']['link']['href'])->toBe('/users/1')
        ->and(render_feed($paginator))->toContain('<a data-sf-subject href="/users/1">Dana</a>')
        ->and(render_feed($json))->toContain('<a data-sf-subject href="/users/1">Dana</a>');
});
