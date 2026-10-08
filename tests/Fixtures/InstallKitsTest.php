<?php

use Illuminate\Filesystem\Filesystem;
use Storyfeed\Ui\Tests\TestCase;

// Invoked by the installed-kit Node test, using the actual Artisan command.
final class InstallKitsTest extends TestCase
{
    public function test_copy_kits_for_import_checks(): void
    {
        foreach (['vue', 'react'] as $kit) {
            $destination = dirname(__DIR__, 2).'/build/installed-'.$kit;
            (new Filesystem)->deleteDirectory($destination);
            $this->artisan('storyfeed:ui', ['kit' => $kit, '--path' => $destination])->assertSuccessful();
        }
    }
}
