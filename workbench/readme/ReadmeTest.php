<?php

use Illuminate\Database\Eloquent\Relations\Relation;
use Illuminate\Support\Facades\Blade;
use Storyfeed\Body\Image;
use Storyfeed\Body\KeyValue;
use Storyfeed\Facades\Story;
use Storyfeed\Facades\Storyfeed;
use Storyfeed\Grouping\Group;
use Storyfeed\MediaSlot;
use Storyfeed\Ui\Support\Page;
use Storyfeed\Ui\Tests\TestCase;
use Workbench\Readme\Booking;
use Workbench\Readme\Fair;
use Workbench\Readme\Member;
use Workbench\Readme\Permit;
use Workbench\Readme\Photo;

require_once __DIR__.'/World.php';

/*
 * Records the README showcase's world through core and renders each state of
 * its arc with the Blade kit: build/readme/states.json holds every state's
 * markup, which showcase.mjs styles, measures and animates. payload.json is
 * the final feed as core serializes it, which kits.mjs renders with the Vue
 * and React kits for the closing frame. Nothing here is drawn by hand; the
 * rows are what an app with these models gets.
 */
final class ReadmeTest extends TestCase
{
    public function test_render_readme_states(): void
    {
        Relation::morphMap(['member' => Member::class, 'fair' => Fair::class, 'booking' => Booking::class, 'photo' => Photo::class, 'permit' => Permit::class]);
        Workbench\Readme\migrate();

        Story::for(Booking::class)->verb('confirm')->headline(':actor confirmed :object for :target')->icon('ticket')->intent('success');
        Story::for(Permit::class)->verb('approve')->headline(':actor approved :object')->icon('file-check');
        Story::for(Fair::class)->verb('join')->headline(':actor joined :object')->icon('user-plus')
            ->groups(Group::byActors()->headline(':actors joined :object'));
        Story::for(Photo::class)->verb('upload')->headline(':actor uploaded :object to :target')->icon('image')->noun('photo|photos');
        Story::verb('upload')->grouped(Group::byActorsOnTarget()->headline(':actors uploaded :count photos to :target'));

        $icons = json_decode(file_get_contents(dirname(__DIR__, 2).'/build/readme/icons.json'), true, flags: JSON_THROW_ON_ERROR);
        $renderers = ['glyph' => fn ($token) => $icons[$token] ?? $icons['activity']];
        $render = fn ($page, string $rail = 'actor') => Blade::render('<x-storyfeed::feed :page="$page" :renderers="$renderers" :rail="$rail" />', ['page' => $page, 'renderers' => $renderers, 'rail' => $rail]);

        $members = collect(['Mira Okafor', 'Theo Lindqvist', 'June Park', 'Sam Ortega', 'Priya Nair', 'Ola Brandt', 'Ines Duarte'])
            ->mapWithKeys(fn (string $name) => [strtolower(strtok($name, ' ')) => Member::create(['name' => $name])]);
        $fair = Fair::create(['name' => 'Maple Street Fair']);
        $states = [];

        // History the arc opens on: a permit, a photo, then a booking.
        $this->travel(-70)->minutes();
        Permit::$body = KeyValue::make(['Stall' => 'Soft pretzels', 'Pitch' => 'B4', 'Fee' => '$120, paid']);
        Storyfeed::activity('approve', Permit::create(['number' => '318']))->by($members['sam'])->publish();
        Permit::$body = null;

        $this->travel(10)->minutes();
        Photo::$body = Image::make(MediaSlot::Preview, caption: 'Fireworks over the river, from the test launch', alt: 'Fireworks over a river at night');
        Storyfeed::activity('upload', Photo::create(['file' => 'fireworks.jpg']))->by($members['theo'])->target($fair)->publish();
        Photo::$body = null;

        $this->travel(10)->minutes();
        Storyfeed::activity('confirm', Booking::create(['number' => '1042']))->by($members['mira'])->target($fair)->publish();

        // 1. One plain row. 2. The same feed with its people and bodies.
        $states['plain'] = $render(Storyfeed::feed()->log()->limit(1)->get(), 'activity-only');
        $states['rich'] = $render(Storyfeed::feed()->live()->limit(3)->get());

        // 3. Five volunteers join, one row each, then one grouped row.
        $this->travel(10)->minutes();
        foreach (['ines', 'ola', 'priya', 'sam', 'june'] as $name) {
            $this->travel(1)->minutes();
            Storyfeed::activity('join', $fair)->by($members[$name])->publish();
        }
        $states['joins'] = $render(Storyfeed::feed()->log()->limit(7)->get());
        $states['joined'] = $render(Storyfeed::feed()->live()->limit(4)->get());

        // 4. Photos arrive live and regroup as each lands.
        $this->travel(20)->minutes();
        $count = 0;
        foreach (['june' => 'ferris.jpg', 'sam' => 'carousel.jpg', 'priya' => 'sundae.jpg', 'ola' => 'pretzels.jpg', 'ines' => 'fair.jpg'] as $name => $file) {
            $this->travel(1)->minutes();
            Storyfeed::activity('upload', Photo::create(['file' => $file]))->by($members[$name])->target($fair)->publish();
            $states['photos'.++$count] = $render(Storyfeed::feed()->live()->limit(3)->get());
        }

        // 5. Everything one volunteer touched.
        $states['scoped'] = $render(Storyfeed::feed()->involving($members['sam'])->live()->limit(3)->get());

        // 6. The richest feed, for all three kits.
        $final = Storyfeed::feed()->live()->limit(3)->get();
        $states['final'] = $render($final);

        $output = dirname(__DIR__, 2).'/build/readme';
        file_put_contents($output.'/states.json', json_encode($states, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR));
        // Tailwind scans the class names as the kit writes them, unescaped.
        file_put_contents($output.'/classes.txt', html_entity_decode(implode("\n", $states)));
        file_put_contents($output.'/payload.json', json_encode(['now' => now()->getTimestampMs(), 'items' => Page::read($final)['items']], JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR));
        $this->assertCount(11, $states);
    }
}
