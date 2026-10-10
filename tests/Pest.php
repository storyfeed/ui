<?php

use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Blade;
use Storyfeed\Facades\Storyfeed;
use Storyfeed\Support\FeedItem;
use Storyfeed\Ui\Support\Page;
use Storyfeed\Ui\Tests\TestCase;

uses(TestCase::class)->in('Feature');

/**
 * Render a Blade string against a page core reads back, with runs of
 * whitespace collapsed so assertions read as the markup does.
 *
 * @param  array<string, mixed>  $data
 */
function render_blade(string $template, array $data = []): string
{
    return structural_html(Blade::render($template, $data));
}

/** Any page core reads: a FeedPage (core <=0.18), or a collection or paginator (storyfeed/storyfeed#95). */
function render_feed(mixed $page = null, string $attributes = ''): string
{
    return render_blade("<x-storyfeed::feed :page=\"\$page\" :grouped=\"false\" rail=\"activity-only\" {$attributes} />", ['page' => $page ?? Storyfeed::feed()->get()]);
}

/** Ignore presentation classes while retaining semantic markup and attributes. */
function structural_html(string $html): string
{
    $html = preg_replace('/ class="[^"]*"/', '', $html);

    return trim((string) preg_replace('/\s+/', ' ', $html));
}

/** The page's nodes as readers, on either core. */
function page_items(mixed $page): Collection
{
    return Page::read($page)['items']->map(fn ($item) => FeedItem::of($item));
}
