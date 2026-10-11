<?php

use Illuminate\Database\Eloquent\Relations\Relation;
use Illuminate\Support\Facades\Blade;
use Storyfeed\Body\Image;
use Storyfeed\Body\KeyValue;
use Storyfeed\Facades\Story;
use Storyfeed\Facades\Storyfeed;
use Storyfeed\Grouping\Group;
use Storyfeed\MediaSlot;
use Storyfeed\Ui\Tests\TestCase;
use Workbench\Readme\Booking;
use Workbench\Readme\Fair;
use Workbench\Readme\Member;
use Workbench\Readme\Permit;
use Workbench\Readme\Photo;

require_once __DIR__.'/World.php';

/*
 * Records the README showcase's world through core and renders each scene
 * with the Blade kit: build/readme/scenes.json holds every scene's markup,
 * which showcase.mjs styles, measures and animates. Nothing here is drawn by
 * hand; the rows are what an app with these models gets.
 */
final class ReadmeTest extends TestCase
{
    public function test_render_readme_scenes(): void
    {
        Relation::morphMap(['member' => Member::class, 'fair' => Fair::class, 'booking' => Booking::class, 'photo' => Photo::class, 'permit' => Permit::class]);
        Workbench\Readme\migrate();

        Story::for(Booking::class)->verb('confirm')->headline(':actor confirmed :object for :target')->icon('ticket')->intent('success');
        Story::for(Photo::class)->verb('upload')->headline(':actor uploaded :object to :target')->icon('image')->noun('photo|photos');
        Story::verb('upload')->grouped(Group::byActorsOnTarget()->headline(':actors uploaded :count photos to :target'));
        Story::for(Permit::class)->verb('approve')->headline(':actor approved :object')->icon('badge-check');

        $icons = json_decode(file_get_contents(dirname(__DIR__, 2).'/build/readme/icons.json'), true, flags: JSON_THROW_ON_ERROR);
        $renderers = ['glyph' => fn ($token) => $icons[$token] ?? $icons['activity']];
        $render = fn ($page) => Blade::render('<x-storyfeed::feed :page="$page" :renderers="$renderers" />', ['page' => $page, 'renderers' => $renderers]);

        [$mira, $theo, $june, $sam, $priya, $ola, $ines] = collect(['Mira Okafor', 'Theo Lindqvist', 'June Park', 'Sam Ortega', 'Priya Nair', 'Ola Brandt', 'Ines Duarte'])
            ->map(fn (string $name) => Member::create(['name' => $name]))->all();
        $fair = Fair::create(['name' => 'Maple Street Fair']);
        $scenes = ['empty' => $render(Storyfeed::feed()->get())];

        $this->travel(-40)->minutes();
        Permit::$body = KeyValue::make(['Stall' => 'Soft pretzels', 'Pitch' => 'B4', 'Fee' => '$120, paid']);
        Storyfeed::activity('approve', Permit::create(['number' => '318']))->by($sam)->publish();
        Permit::$body = null;

        $this->travel(9)->minutes();
        Photo::$body = Image::make(MediaSlot::Preview, caption: 'Fireworks over the river, from the test launch', alt: 'Fireworks over a river at night');
        Storyfeed::activity('upload', Photo::create(['file' => 'fireworks.jpg']))->by($theo)->target($fair)->publish();
        Photo::$body = null;
        $scenes['bodies'] = $render(Storyfeed::feed()->log()->limit(2)->get());

        $this->travel(20)->minutes();
        foreach ([[$june, 'ferris.jpg'], [$sam, 'carousel.jpg'], [$priya, 'sundae.jpg'], [$ola, 'pretzels.jpg']] as [$member, $file]) {
            $this->travel(1)->minutes();
            Storyfeed::activity('upload', Photo::create(['file' => $file]))->by($member)->target($fair)->publish();
        }

        $this->travel(4)->minutes();
        Storyfeed::activity('confirm', Booking::create(['number' => '1042']))->by($mira)->target($fair)->publish();
        $scenes['record'] = $render(Storyfeed::feed()->log()->limit(1)->get());
        $scenes['grouped'] = $render(Storyfeed::feed()->live()->limit(2)->get());
        $scenes['scoped'] = $render(Storyfeed::feed()->involving($sam)->live()->get());

        $this->travel(2)->minutes();
        Storyfeed::activity('upload', Photo::create(['file' => 'fair.jpg']))->by($ines)->target($fair)->publish();
        $scenes['live'] = $render(Storyfeed::feed()->live()->limit(2)->get());
        $scenes['poster'] = $render(Storyfeed::feed()->live()->limit(4)->get());

        $output = dirname(__DIR__, 2).'/build/readme';
        file_put_contents($output.'/scenes.json', json_encode($scenes, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR));
        // Tailwind scans the class names as the kit writes them, unescaped.
        file_put_contents($output.'/classes.txt', html_entity_decode(implode("\n", $scenes)));
        $this->assertCount(7, $scenes);
    }
}
