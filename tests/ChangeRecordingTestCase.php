<?php

namespace Storyfeed\Ui\Tests;

use Orchestra\Testbench\TestCase;
use ReflectionClass;
use Storyfeed\StoryfeedServiceProvider;

class ChangeRecordingTestCase extends TestCase
{
    protected function getPackageProviders($app): array
    {
        return [StoryfeedServiceProvider::class];
    }

    protected function defineEnvironment($app): void
    {
        $app['config']->set('database.default', 'testing');
        $app['config']->set('storyfeed.verbs.strict', false);
        $app['config']->set('storyfeed.grammar.strict', false);
    }

    protected function defineDatabaseMigrations(): void
    {
        $package = dirname((new ReflectionClass(StoryfeedServiceProvider::class))->getFileName(), 2);
        $stubs = glob($package.'/database/migrations/*.stub');
        usort($stubs, fn ($a, $b) => str_starts_with(basename($b), 'create_') <=> str_starts_with(basename($a), 'create_'));

        foreach ($stubs as $stub) {
            (include $stub)->up();
        }
    }
}
