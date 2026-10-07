<?php

namespace Storyfeed\Ui;

use Illuminate\Support\ServiceProvider;
use Storyfeed\Ui\Commands\InstallUiCommand;

/**
 * The Blade kit, registered the way Laravel's package documentation says:
 * views under the `storyfeed` namespace, so anonymous components render as
 * `<x-storyfeed::feed :page="$page" />`, and the views are publishable.
 *
 * The precedent is pagination: core hands over the data (a FeedPage of
 * FeedItem readers), and this package renders default views an app publishes
 * and restyles.
 */
class UiServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        // Core registers the `storyfeed` TRANSLATION namespace and no views,
        // so the view namespace is this package's to take.
        $this->loadTranslationsFrom(__DIR__.'/../resources/lang', 'storyfeed-ui');

        $this->loadViewsFrom(__DIR__.'/../resources/views', 'storyfeed');

        if ($this->app->runningInConsole()) {
            $this->commands([InstallUiCommand::class]);
            $this->publishes([
                __DIR__.'/../resources/views' => resource_path('views/vendor/storyfeed'),
            ], 'storyfeed-views');

        }
    }
}
