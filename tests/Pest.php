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
    return trim((string) preg_replace('/\s+/', ' ', Blade::render($template, $data)));
}

function render_feed(?FeedPage $page = null, string $attributes = ''): string
{
    return render_blade("<x-storyfeed::feed :page=\"\$page\" {$attributes} />", ['page' => $page ?? Storyfeed::feed()->get()]);
}
