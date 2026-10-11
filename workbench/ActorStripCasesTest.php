<?php

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\Relation;
use Illuminate\Support\Facades\Schema;
use Storyfeed\Concerns\InteractsWithFeed;
use Storyfeed\Contracts\Feedable;
use Storyfeed\Facades\Story;
use Storyfeed\Facades\Storyfeed;
use Storyfeed\FeedContext;
use Storyfeed\FeedEntity;
use Storyfeed\FeedImage;
use Storyfeed\FeedMedia;
use Storyfeed\Ui\Support\Page;
use Storyfeed\Ui\Tests\TestCase;

/**
 * Actor strip exploration (ui#48): a 35-person check-in group and a 5-person
 * one, as core writes them with its default config, stored in
 * `actor-strip/cases.json` for the comparison page. Exploration only.
 */
final class ActorStripCasesTest extends TestCase
{
    public function test_write_actor_strip_cases(): void
    {
        $this->travelTo(now()->setDate(2026, 8, 14)->startOfDay()->addHours(12));

        foreach (['crowd_people', 'crowd_places'] as $table) {
            Schema::create($table, function ($blueprint) {
                $blueprint->id();
                $blueprint->string('name');
                $blueprint->string('portrait')->nullable();
                $blueprint->timestamps();
            });
        }

        Relation::enforceMorphMap([...Relation::morphMap(), 'person' => CrowdPerson::class, 'place' => CrowdPlace::class]);

        Story::verb('check_in')->headline(':actor checked in at :object')->icon('map-pin')
            ->grouped(fn ($group) => $group->actors(':actors checked in at :object'));

        $names = [
            'Murray Bauman', 'Joyce Byers', 'Jim Hopper', 'Nancy Wheeler', 'Jonathan Byers', 'Steve Harrington', 'Robin Buckley',
            'Dustin Henderson', 'Lucas Sinclair', 'Erica Sinclair', 'Max Mayfield', 'Will Byers', 'Mike Wheeler', 'Karen Wheeler',
            'Ted Wheeler', 'Holly Wheeler', 'Claudia Henderson', 'Billy Hargrove', 'Heather Holloway', 'Bob Newby', 'Barb Holland',
            'Eddie Munson', 'Argyle', 'Suzie Bingham', 'Vickie Dunne', 'Chrissy Cunningham', 'Jason Carver', 'Wayne Munson',
            'Dmitri Antonov', 'Enzo Ruiz', 'Keith Lawson', 'Tammy Thompson', 'Benny Hammond', 'Scott Clarke', 'Terry Ives',
        ];

        // 1. 35 people checked in at the Fun Fair: roughly every other one has a portrait.
        $fair = CrowdPlace::create(['name' => 'Fun Fair']);
        foreach (array_reverse($names) as $index => $name) {
            $this->travel(1)->minutes();
            $person = CrowdPerson::create(['name' => $name, 'portrait' => $index % 2 === 0 || $index % 7 === 3 ? (string) $index : null]);
            Storyfeed::activity('check_in', $fair)->by($person)->publish();
        }

        // 2. Five people checked in at the Arcade: the headline names three.
        $this->travel(30)->minutes();
        $arcade = CrowdPlace::create(['name' => 'Palace Arcade']);
        foreach ([['Keith Hogan', '3'], ['Will Cole', null], ['Dart Ortega', '8'], ['Phil Kowalski', '11'], ['Kali Prasad', null]] as [$name, $portrait]) {
            $this->travel(1)->minutes();
            Storyfeed::activity('check_in', $arcade)->by(CrowdPerson::create(['name' => $name, 'portrait' => $portrait]))->publish();
        }

        $items = json_decode((string) json_encode(Page::read(Storyfeed::feed()->live()->get())['items']), true, flags: JSON_THROW_ON_ERROR);
        $groups = array_values(array_filter($items, fn (array $item) => $item['kind'] === 'group'));
        $this->assertCount(2, $groups, 'each scene is one group');

        $cases = [];
        foreach ($groups as $group) {
            $cases[$group['count'] > 10 ? 'crowd' : 'small'] = $group;
        }
        $this->assertSame(35, $cases['crowd']['distinct']['actors']);

        file_put_contents(__DIR__.'/actor-strip/cases.json', json_encode($cases, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR)."\n");
    }
}

/** An original flat head-and-shoulders portrait, a stand-in for a profile photo; colours vary by seed. */
function crowd_portrait(int $seed): FeedImage
{
    $bgs = ['#fde68a', '#bfdbfe', '#d9f99d', '#fecdd3', '#ddd6fe', '#a7f3d0', '#fed7aa', '#e2e8f0'];
    $skins = ['#f1c7a5', '#e8b896', '#8d5a3b', '#c68c63', '#f5d0b5', '#5c3a24'];
    $hairs = ['#c2410c', '#78350f', '#1f2937', '#eab308', '#57534e', '#111827', '#9a3412'];
    $shirts = ['#0f766e', '#7c3aed', '#b91c1c', '#1d4ed8', '#be185d', '#4d7c0f', '#334155'];
    [$bg, $skin, $hair, $shirt] = [$bgs[$seed % 8], $skins[($seed * 5) % 6], $hairs[($seed * 3) % 7], $shirts[($seed * 2 + 1) % 7]];
    $svg = "<svg xmlns='http://www.w3.org/2000/svg' width='96' height='96' viewBox='0 0 96 96'><rect width='96' height='96' fill='{$bg}'/><path d='M14 96c2-20 16-30 34-30s32 10 34 30z' fill='{$shirt}'/><rect x='40' y='54' width='16' height='16' rx='6' fill='{$skin}'/><circle cx='48' cy='40' r='18' fill='{$skin}'/><path d='M29 40c0-14 8-22 19-22s19 8 19 22c-4-8-10-11-19-11s-15 3-19 11z' fill='{$hair}'/></svg>";

    return FeedImage::make('data:image/svg+xml,'.rawurlencode($svg), 'image/svg+xml', 96, 96);
}

class CrowdPerson extends Model implements Feedable
{
    use InteractsWithFeed;

    protected $table = 'crowd_people';

    protected $guarded = [];

    public function toFeed(): FeedEntity
    {
        return FeedEntity::make(label: $this->name, data: ['portrait' => $this->portrait]);
    }

    public static function feedMedia(FeedContext $context): ?FeedMedia
    {
        $portrait = $context->data('portrait');

        return FeedMedia::make('/people/'.$context->key(), icon: $portrait !== null ? crowd_portrait((int) $portrait) : null);
    }
}

class CrowdPlace extends Model implements Feedable
{
    use InteractsWithFeed;

    protected $table = 'crowd_places';

    protected $guarded = [];

    public function toFeed(): FeedEntity
    {
        return FeedEntity::make(label: $this->name);
    }
}
