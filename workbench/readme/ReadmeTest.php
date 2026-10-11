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
use Workbench\Readme\Doc;
use Workbench\Readme\Fair;
use Workbench\Readme\Member;
use Workbench\Readme\Permit;
use Workbench\Readme\Photo;
use Workbench\Readme\Project;
use Workbench\Readme\Reader;
use Workbench\Readme\Visit;

require_once __DIR__.'/World.php';

/*
 * Records the README showcase's worlds through core and renders them with the
 * Blade kit. build/readme/states.json holds each state of the feed inside the
 * picture; outer.json the feed of looks the camera pulls back to. showcase.mjs
 * styles, measures and animates them. Nothing here is drawn by hand; the rows
 * are what an app with these models gets.
 */
final class ReadmeTest extends TestCase
{
    private function renderer(string $rail = 'actor', mixed $viewer = null): Closure
    {
        $icons = json_decode(file_get_contents(dirname(__DIR__, 2).'/build/readme/icons.json'), true, flags: JSON_THROW_ON_ERROR);
        $renderers = ['glyph' => fn ($token) => $icons[$token] ?? $icons['activity']];

        return fn ($page, ?string $as = null) => Blade::render('<x-storyfeed::feed :page="$page" :renderers="$renderers" :rail="$rail" :viewer="$viewer" />', ['page' => $page, 'renderers' => $renderers, 'rail' => $as ?? $rail, 'viewer' => $viewer]);
    }

    /** Writes the rendered states, and the class names as the kit writes them (unescaped) for Tailwind to scan. */
    private function write(string $name, array $states): void
    {
        $output = dirname(__DIR__, 2).'/build/readme';
        file_put_contents("{$output}/{$name}.json", json_encode($states, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR));
        file_put_contents("{$output}/{$name}-classes.txt", html_entity_decode(implode("\n", $states)));
    }

    /** The feed inside the picture, top-first: every activity arrives above the ones before it. */
    public function test_render_showcase_states(): void
    {
        Relation::morphMap(['member' => Member::class, 'fair' => Fair::class, 'booking' => Booking::class, 'photo' => Photo::class, 'permit' => Permit::class]);
        Workbench\Readme\migrate();

        Story::for(Booking::class)->verb('confirm')->headline(':actor confirmed :object for :target')->icon('ticket')->intent('success');
        Story::for(Permit::class)->verb('approve')->headline(':actor approved :object')->icon('file-check');
        Story::for(Fair::class)->verb('join')->headline(':actor joined :object')->icon('user-plus')
            ->groups(Group::byActors()->headline(':actors joined :object'));
        Story::for(Photo::class)->verb('upload')->headline(':actor uploaded :object to :target')->icon('image')->noun('photo|photos');
        Story::verb('upload')->grouped(Group::byActorsOnTarget()->headline(':actors uploaded :count photos to :target'));

        $render = $this->renderer();
        $members = collect(['Mira Okafor', 'Theo Lindqvist', 'June Park', 'Sam Ortega', 'Priya Nair', 'Ola Brandt'])
            ->mapWithKeys(fn (string $name) => [strtolower(strtok($name, ' ')) => Member::create(['name' => $name])]);
        $fair = Fair::create(['name' => 'Maple Street Fair']);
        $states = [];

        // One plain row, then the same row with its person.
        $this->travel(-70)->minutes();
        Storyfeed::activity('confirm', Booking::create(['number' => '1042']))->by($members['mira'])->target($fair)->publish();
        $states['plain'] = $render(Storyfeed::feed()->log()->limit(1)->get(), 'activity-only');
        $states['avatar'] = $render(Storyfeed::feed()->log()->limit(1)->get());

        // Bodies: a key-value card, then a photo.
        $this->travel(10)->minutes();
        Permit::$body = KeyValue::make(['Stall' => 'Soft pretzels', 'Pitch' => 'B4', 'Fee' => '$120, paid']);
        Storyfeed::activity('approve', Permit::create(['number' => '318']))->by($members['sam'])->publish();
        Permit::$body = null;
        $states['rich1'] = $render(Storyfeed::feed()->live()->limit(3)->get());

        $this->travel(10)->minutes();
        Photo::$body = Image::make(MediaSlot::Preview, caption: 'Fireworks over the river, from the test launch', alt: 'Fireworks over a river at night');
        Storyfeed::activity('upload', Photo::create(['file' => 'fireworks.jpg']))->by($members['theo'])->target($fair)->publish();
        Photo::$body = null;
        $states['rich2'] = $render(Storyfeed::feed()->live()->limit(3)->get());

        // Three volunteers join, one row each, then one grouped row.
        $this->travel(10)->minutes();
        foreach (['priya', 'sam', 'june'] as $name) {
            $this->travel(1)->minutes();
            Storyfeed::activity('join', $fair)->by($members[$name])->publish();
        }
        $states['joins'] = $render(Storyfeed::feed()->log()->limit(6)->get());
        $states['joined'] = $render(Storyfeed::feed()->live()->limit(4)->get());

        // Photos arrive live and regroup as each lands; the feed as the last one lands is the finished frame.
        $this->travel(20)->minutes();
        foreach (['photos1' => ['june', 'ferris.jpg'], 'photos2' => ['sam', 'carousel.jpg'], 'photos3' => ['priya', 'sundae.jpg'], 'finished' => ['ola', 'pretzels.jpg']] as $state => [$name, $file]) {
            $this->travel(1)->minutes();
            Storyfeed::activity('upload', Photo::create(['file' => $file]))->by($members[$name])->target($fair)->publish();
            $states[$state] = $render(Storyfeed::feed()->live()->limit(4)->get());
        }

        $this->write('states', $states);
        $this->assertSame(['plain', 'avatar', 'rich1', 'rich2', 'joins', 'joined', 'photos1', 'photos2', 'photos3', 'finished'], array_keys($states));
    }

    /** The feed the camera pulls back to: past looks at the README, yours, then the next one, still in progress. */
    public function test_render_feed_of_looks(): void
    {
        Relation::morphMap(['doc' => Doc::class, 'reader' => Reader::class, 'project' => Project::class, 'visit' => Visit::class]);
        Workbench\Readme\migrateLooks();

        Story::for(Doc::class)->verb('look')->headline(":actor looked at :target's :object")->icon('eye');
        Story::for(Visit::class)->verb('view')->headline(":actor is looking at :context's :target")->icon('eye')->intent('pending');
        $readme = Doc::create(['title' => 'README']);
        $storyfeed = Project::create(['name' => 'Storyfeed']);
        $you = Reader::create(['name' => 'Robin Avery']);

        foreach ([6, 4, 2] as $ago) {
            $this->travelTo(now()->setTime(12, 0)->subMinutes($ago));
            Storyfeed::anonymous()->action('look', $readme)->target($storyfeed)->publish();
        }
        $this->travelTo(now()->setTime(12, 0));
        Storyfeed::activity('look', $readme)->by($you)->target($storyfeed)->publish();
        $this->travel(20)->seconds();
        Storyfeed::anonymous()->action('view', Visit::create())->target($readme)->context($storyfeed)->publish();

        $feed = $this->renderer('activity-only', $you)(Storyfeed::feed()->log()->limit(4)->get());
        // "Storyfeed's README", both linked: fail rather than ship a wrong headline.
        $this->assertStringContainsString("</a>'s <a", html_entity_decode($feed), "The feed of looks lost its possessive :target's.");
        $this->write('looks', ['feed' => $feed]);
    }
}
