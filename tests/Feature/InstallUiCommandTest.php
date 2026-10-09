<?php

use Illuminate\Filesystem\Filesystem;
use Illuminate\Support\Facades\Artisan;

beforeEach(function () {
    $this->kitPath = sys_get_temp_dir().'/storyfeed-ui-'.bin2hex(random_bytes(8));
});

afterEach(function () {
    (new Filesystem)->deleteDirectory($this->kitPath);
});

function kit_source(): string
{
    return dirname(__DIR__, 2).'/resources/js/vue';
}

test('vue command copies every component and supporting file and explains setup', function () {
    $this->artisan('storyfeed:ui', ['kit' => 'vue', '--path' => $this->kitPath])
        ->expectsOutputToContain('differs: 0')
        ->expectsOutputToContain('@plugin "@tailwindcss/typography";')
        ->expectsOutputToContain('@source "')
        ->expectsOutputToContain('starter-kit colour tokens')
        ->assertSuccessful();

    $files = new Filesystem;
    foreach ($files->allFiles(kit_source()) as $file) {
        expect(file_get_contents($this->kitPath.'/'.$file->getRelativePathname()))->toBe(strtr($file->getContents(), ["'../shared/" => "'./shared/", "'../../shared/" => "'../shared/"]));
    }
});

test('identical copies are skipped', function () {
    $files = new Filesystem;
    Artisan::call('storyfeed:ui', ['kit' => 'vue', '--path' => $this->kitPath]);
    $total = count($files->allFiles($this->kitPath));
    $file = $this->kitPath.'/FeedStream.vue';
    touch($file, 1000000000);

    $this->artisan('storyfeed:ui', ['kit' => 'vue', '--path' => $this->kitPath])
        ->expectsOutputToContain("Written: 0; unchanged: {$total}; differs: 0.")
        ->assertSuccessful();
    clearstatcache(true, $file);
    expect(filemtime($file))->toBe(1000000000);
});

test('app edits are preserved and missing files are added', function () {
    mkdir($this->kitPath);
    file_put_contents($this->kitPath.'/FeedStream.vue', 'app-owned');
    file_put_contents($this->kitPath.'/Local.vue', 'custom component');

    $this->artisan('storyfeed:ui', ['kit' => 'vue', '--path' => $this->kitPath])
        ->expectsOutputToContain('Differs: FeedStream.vue (kept). Use --diff')
        ->expectsOutputToContain('differs: 1')
        ->assertSuccessful();
    expect(file_get_contents($this->kitPath.'/FeedStream.vue'))->toBe('app-owned');
    expect(file_get_contents($this->kitPath.'/Local.vue'))->toBe('custom component');
    expect(is_file($this->kitPath.'/body/ComponentBody.vue'))->toBeTrue();
});

test('force replaces edited files', function () {
    mkdir($this->kitPath);
    file_put_contents($this->kitPath.'/FeedStream.vue', 'app-owned');
    $this->artisan('storyfeed:ui', ['kit' => 'vue', '--path' => $this->kitPath, '--force' => true])->assertSuccessful();
    expect(file_get_contents($this->kitPath.'/FeedStream.vue'))->toContain("from './shared/types'");
});

test('diff prints a unified app to kit patch without overwriting edits', function () {
    mkdir($this->kitPath);
    file_put_contents($this->kitPath.'/FeedStream.vue', "app-owned\n");
    $exit = Artisan::call('storyfeed:ui', ['kit' => 'vue', '--path' => $this->kitPath, '--diff' => true]);
    expect($exit)->toBe(0);
    expect(Artisan::output())->toContain('--- app/FeedStream.vue', '+++ kit/FeedStream.vue', '-app-owned', '@@');
    expect(file_get_contents($this->kitPath.'/FeedStream.vue'))->toBe("app-owned\n");
});

test('default path is the app components directory', function () {
    $destination = resource_path('js/components/storyfeed');
    try {
        $this->artisan('storyfeed:ui', ['kit' => 'vue'])
            ->expectsOutputToContain('@source "../js/components/storyfeed";')->assertSuccessful();
        expect(is_file($destination.'/FeedStream.vue'))->toBeTrue();
    } finally {
        (new Filesystem)->deleteDirectory($destination);
    }
});

test('path option supports app relative destinations', function () {
    $relative = 'resources/js/custom-'.basename($this->kitPath);
    $destination = base_path($relative);
    try {
        $this->artisan('storyfeed:ui', ['kit' => 'vue', '--path' => $relative])
            ->expectsOutputToContain('@source "../js/custom-'.basename($this->kitPath).'";')->assertSuccessful();
        expect(is_file($destination.'/FeedStream.vue'))->toBeTrue();
    } finally {
        (new Filesystem)->deleteDirectory($destination);
    }
});

test('unknown kits and empty paths fail without copying', function () {
    $this->artisan('storyfeed:ui', ['kit' => 'unknown', '--path' => $this->kitPath])->assertFailed();
    $this->artisan('storyfeed:ui', ['kit' => 'vue', '--path' => ''])->assertFailed();
    expect(is_dir($this->kitPath))->toBeFalse();
});

test('diff keeps surrounding context and reports a missing final newline', function () {
    Artisan::call('storyfeed:ui', ['kit' => 'vue', '--path' => $this->kitPath]);
    $target = $this->kitPath.'/FeedNode.vue';
    $source = file_get_contents($target);
    $edited = str_replace("'./FeedGroup.vue'", "'./CustomGroup.vue'", $source);
    file_put_contents($target, $edited);
    Artisan::call('storyfeed:ui', ['kit' => 'vue', '--path' => $this->kitPath, '--diff' => true]);
    expect(Artisan::output())
        ->toContain("-import FeedGroup from './CustomGroup.vue';", "+import FeedGroup from './FeedGroup.vue';")
        ->not->toContain('Unknown kinds');
    expect(file_get_contents($target))->toBe($edited);

    file_put_contents($target, rtrim($source, "\r\n"));
    Artisan::call('storyfeed:ui', ['kit' => 'vue', '--path' => $this->kitPath, '--diff' => true]);
    expect(Artisan::output())->toContain("-</template>\n\\ No newline at end of file\n+</template>");
    expect(file_get_contents($target))->toBe(rtrim($source, "\r\n"));
});

test('react copies self contained kit and shared core, preserves edits, diffs and forces updates', function () {
    $this->artisan('storyfeed:ui', ['kit' => 'react', '--path' => $this->kitPath])
        ->expectsOutputToContain('React 19')->assertSuccessful();
    expect(file_get_contents($this->kitPath.'/FeedItem.tsx'))->toContain("from './shared/types'");
    expect(file_get_contents($this->kitPath.'/body/index.tsx'))->toContain("from '../shared/body'");
    expect(file_get_contents($this->kitPath.'/shared/prose.ts'))->toBe(file_get_contents(dirname(__DIR__, 2).'/resources/js/shared/prose.ts'));
    $file = $this->kitPath.'/FeedStream.tsx';
    touch($file, 1000000000);
    $this->artisan('storyfeed:ui', ['kit' => 'react', '--path' => $this->kitPath])
        ->expectsOutputToContain('Written: 0;')->assertSuccessful();
    clearstatcache(true, $file);
    expect(filemtime($file))->toBe(1000000000);
    file_put_contents($file, 'app-owned');
    file_put_contents($this->kitPath.'/shared/messages.ts', 'translated');
    Artisan::call('storyfeed:ui', ['kit' => 'react', '--path' => $this->kitPath, '--diff' => true]);
    expect(Artisan::output())->toContain('--- app/FeedStream.tsx', '--- app/shared/messages.ts', 'differs: 2');
    expect(file_get_contents($file))->toBe('app-owned');
    $this->artisan('storyfeed:ui', ['kit' => 'react', '--path' => $this->kitPath, '--force' => true])->assertSuccessful();
    expect(file_get_contents($file))->toContain('export default function FeedStream');
    expect(file_get_contents($this->kitPath.'/shared/messages.ts'))->toContain('instrument');
});

test('react default and relative destinations include the shared core', function () {
    foreach ([null, 'resources/js/react-install-test'] as $path) {
        $destination = $path === null ? resource_path('js/components/storyfeed') : base_path($path);
        try {
            $arguments = ['kit' => 'react'];
            if ($path !== null) {
                $arguments['--path'] = $path;
            }
            $this->artisan('storyfeed:ui', $arguments)->assertSuccessful();
            expect(is_file($destination.'/FeedStream.tsx'))->toBeTrue();
            expect(is_file($destination.'/shared/body.ts'))->toBeTrue();
        } finally {
            (new Filesystem)->deleteDirectory($destination);
        }
    }
});
