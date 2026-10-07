<?php

use Illuminate\Support\Facades\Blade;
use Storyfeed\Facades\Storyfeed;
use Storyfeed\Payload\FeedPage;
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

function render_feed(?FeedPage $page = null, string $attributes = ''): string
{
    return render_blade("<x-storyfeed::feed :page=\"\$page\" :grouped=\"false\" rail=\"activity-only\" {$attributes} />", ['page' => $page ?? Storyfeed::feed()->get()]);
}

/** Ignore presentation classes while retaining semantic markup and attributes. */
function structural_html(string $html): string
{
    $html = preg_replace('/ class="[^"]*"/', '', $html);

    return trim((string) preg_replace('/\s+/', ' ', $html));
}
