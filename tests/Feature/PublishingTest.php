<?php

use Illuminate\Support\Facades\Blade;
use Illuminate\Support\Facades\File;
use Illuminate\Support\ServiceProvider;
use Storyfeed\Facades\Storyfeed;
use Storyfeed\Ui\Tests\Fixtures\Order;
use Storyfeed\Ui\Tests\Fixtures\User;
use Storyfeed\Ui\UiServiceProvider;

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

    foreach (['feed', 'item', 'activity', 'group', 'digest', 'glyph', 'headline', 'meta', 'time', 'body', 'pager', 'body/key-value', 'body/media-object'] as $component) {
        expect("{$published}/components/{$component}.blade.php")->toBeFile();
    }

    File::put("{$published}/components/time.blade.php", '@props([\'at\'])<time>{{ $at->format(\'H:i\') }}</time>');

    Storyfeed::activity('place', Order::create(['number' => '1']))->by(User::create(['name' => 'Dana', 'email' => 'd@example.com']))->publish();

    expect(render_feed())->toContain('<time>12:00</time>');
});

it('draws an icon an app adds for its glyph token', function () {
    File::ensureDirectoryExists(resource_path('views/vendor/storyfeed/icons'));
    File::put(resource_path('views/vendor/storyfeed/icons/shopping-bag.blade.php'), '<svg></svg>');

    Storyfeed::grammar(['order.place' => ':actor placed :object'])->icons(['order.place' => 'shopping-bag']);
    Storyfeed::activity('place', Order::create(['number' => '1']))->by(User::create(['name' => 'Dana', 'email' => 'd@example.com']))->publish();

    expect(render_feed())->toContain('aria-hidden="true"> <svg></svg>');
});

it('falls back to the default icon for a token with no view, or one that is not a view name', function () {
    foreach (['bi-truck', '../../secrets', 'a.b'] as $token) {
        expect(render_blade('<x-storyfeed::glyph :glyph="$token" />', ['token' => $token]))
            ->toContain('<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>');
    }
});

it('registers views without a stylesheet directive or asset publish group', function () {
    expect(Blade::getCustomDirectives())->not->toHaveKey('storyfeedStyles')
        ->and(ServiceProvider::pathsToPublish(UiServiceProvider::class, 'storyfeed-assets'))->toBe([]);
});
