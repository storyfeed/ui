<?php

use Illuminate\Support\Facades\File;
use Storyfeed\Facades\Storyfeed;
use Storyfeed\Ui\Tests\Fixtures\Order;
use Storyfeed\Ui\Tests\Fixtures\User;

/*
 * The pagination precedent: the kit's views are defaults an app publishes
 * and restyles, and a published view wins over the package's.
 */

afterEach(function () {
    File::deleteDirectory(resource_path('views/vendor/storyfeed'));
    File::deleteDirectory(public_path('vendor/storyfeed'));
});

it('publishes the views, and a published view replaces the package\'s', function () {
    $this->artisan('vendor:publish', ['--tag' => 'storyfeed-views'])->assertSuccessful();

    $published = resource_path('views/vendor/storyfeed');

    foreach (['feed', 'item', 'activity', 'group', 'digest', 'glyph', 'time', 'body', 'pager', 'body/key-value', 'body/media-object'] as $component) {
        expect("{$published}/components/{$component}.blade.php")->toBeFile();
    }

    File::put("{$published}/components/time.blade.php", '@props([\'at\'])<time class="mine">{{ $at->format(\'H:i\') }}</time>');

    Storyfeed::activity('place', Order::create(['number' => '1']))->by(User::create(['name' => 'Dana', 'email' => 'd@example.com']))->publish();

    expect(render_feed())->toContain('<time class="mine">12:00</time>');
});

it('draws an icon an app adds for its glyph token', function () {
    File::ensureDirectoryExists(resource_path('views/vendor/storyfeed/icons'));
    File::put(resource_path('views/vendor/storyfeed/icons/shopping-bag.blade.php'), '<svg class="bag"></svg>');

    Storyfeed::grammar(['order.place' => ':actor placed :object'])->icons(['order.place' => 'shopping-bag']);
    Storyfeed::activity('place', Order::create(['number' => '1']))->by(User::create(['name' => 'Dana', 'email' => 'd@example.com']))->publish();

    expect(render_feed())->toContain('class="sf-icon" aria-hidden="true"><svg class="bag"></svg>');
});

it('falls back to the default icon for a token with no view, or one that is not a view name', function () {
    foreach (['bi-truck', '../../secrets', 'a.b'] as $token) {
        expect(render_blade('<x-storyfeed::glyph :glyph="$token" />', ['token' => $token]))
            ->toContain('<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>');
    }
});

it('inlines the stylesheet with @storyfeedStyles, as @livewireStyles does', function () {
    $html = render_blade('@storyfeedStyles');

    expect($html)->toStartWith('<style>')
        ->toEndWith('</style>')
        ->toContain('.sf-feed {')
        ->toContain('--sf-text: var(--sf-text-color, #1f2933);');
});

it('publishes the stylesheet as an asset for an app that would rather serve it', function () {
    $this->artisan('vendor:publish', ['--tag' => 'storyfeed-assets'])->assertSuccessful();

    expect(public_path('vendor/storyfeed/storyfeed.css'))->toBeFile()
        ->and(file_get_contents(public_path('vendor/storyfeed/storyfeed.css')))->toContain('.sf-feed {');
});

it('styles every class the views use', function () {
    $css = file_get_contents(dirname(__DIR__, 2).'/resources/css/storyfeed.css');
    $views = collect(File::allFiles(dirname(__DIR__, 2).'/resources/views'))->map(fn ($file) => $file->getContents())->implode("\n");

    preg_match_all('/(?<![\w-])sf-[a-z0-9_-]+/', $views, $matches);

    // Hooks rather than looks: nothing to style on them by default.
    $unstyled = ['sf-digest', 'sf-toggle__more', 'sf-toggle__less'];

    $missing = collect($matches[0])->unique()->reject(fn ($class) => in_array($class, $unstyled, true) || str_contains($css, ".{$class}"))->values();

    expect($missing->all())->toBe([]);
});
