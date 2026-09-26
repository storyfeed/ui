<?php

namespace Storyfeed\Ui\Tests;

use Illuminate\Database\Eloquent\Relations\Relation;
use Orchestra\Testbench\TestCase as Orchestra;
use Storyfeed\StoryfeedServiceProvider;
use Storyfeed\Ui\Tests\Fixtures\Customer;
use Storyfeed\Ui\Tests\Fixtures\Order;
use Storyfeed\Ui\Tests\Fixtures\User;
use Storyfeed\Ui\UiServiceProvider;

/**
 * An app with core installed and this kit beside it. The kit's tests publish
 * activities through core and render the pages core reads back, so what is
 * asserted is the markup a real feed produces, not a hand-written payload.
 */
class TestCase extends Orchestra
{
    protected function setUp(): void
    {
        parent::setUp();

        // Midday, so a test's activities never straddle midnight and split
        // a group that would otherwise be one.
        $this->travelTo(now()->setDate(2026, 9, 25)->startOfDay()->addHours(12));

        Relation::enforceMorphMap([
            'user' => User::class,
            'customer' => Customer::class,
            'order' => Order::class,
        ]);

        Order::$body = null;
        Order::$preview = null;
    }

    protected function getPackageProviders($app)
    {
        return [
            StoryfeedServiceProvider::class,
            UiServiceProvider::class,
        ];
    }

    public function getEnvironmentSetUp($app)
    {
        config()->set('database.default', 'testing');
        config()->set('storyfeed.verbs.strict', false);
        config()->set('storyfeed.grammar.strict', false);
        config()->set('storyfeed.discovery.paths', [__DIR__.'/Fixtures']);
        config()->set('auth.providers.users.model', User::class);
    }

    protected function defineDatabaseMigrations(): void
    {
        // Core's migration stubs, create_* first, then the fixtures' tables.
        $stubs = glob(dirname(__DIR__).'/vendor/storyfeed/storyfeed/database/migrations/*.stub') ?: [];

        usort($stubs, fn (string $a, string $b): int => str_starts_with(basename($b), 'create_') <=> str_starts_with(basename($a), 'create_'));

        foreach ($stubs as $stub) {
            (include $stub)->up();
        }

        (include __DIR__.'/Fixtures/migration.php')->up();
    }
}
