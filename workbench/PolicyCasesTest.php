<?php

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\Relation;
use Illuminate\Support\Facades\Schema;
use Storyfeed\Body\Image;
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
 * Strip policy exploration: five scenes as core writes them, stored in
 * `strip-policy/cases.json` for the comparison page. Exploration only.
 */
final class PolicyCasesTest extends TestCase
{
    public function test_write_policy_cases(): void
    {
        $this->travelTo(now()->setDate(2026, 8, 14)->startOfDay()->addHours(12));

        foreach (['policy_people', 'policy_things'] as $table) {
            Schema::create($table, function ($blueprint) {
                $blueprint->id();
                $blueprint->string('name');
                $blueprint->string('kind')->nullable();
                $blueprint->string('photo')->nullable();
                $blueprint->string('icon')->nullable();
                $blueprint->timestamps();
            });
        }

        Relation::enforceMorphMap([...Relation::morphMap(), 'person' => PolicyPerson::class, 'thing' => PolicyThing::class]);

        Story::verb('place')->headline(':actor placed :object with :target')->icon('shopping-bag')
            ->grouped(fn ($group) => $group->repeat(':actor placed :count orders with :target'));
        Story::verb('check_in')->headline(':actor checked in at :object')->icon('map-pin')
            ->grouped(fn ($group) => $group->actors(':actors checked in at :object'));
        Story::verb('add')->headline(':actor added :object to :target')->icon('utensils')
            ->grouped(fn ($group) => $group->repeat(':actor added :count items to :target'));
        Story::verb('post')->headline(':actor posted :object in :target')->icon('file-up')
            ->grouped(fn ($group) => $group->repeat(':actor posted :count things in :target'));
        Story::verb('restock')->headline(':actor restocked :object')->icon('package')
            ->grouped(fn ($group) => $group->repeat(':actor restocked :count products'));

        $person = fn (string $name, ?string $photo = null) => PolicyPerson::create(['name' => $name, 'photo' => $photo]);
        $thing = fn (array $attributes) => PolicyThing::create($attributes);

        // 1. Erica placed 3 orders with Scoops Ahoy: no pictures anywhere.
        $erica = $person('Erica Sinclair');
        $scoops = $thing(['name' => 'Scoops Ahoy', 'kind' => 'shop']);
        foreach ([2031, 2032, 2033] as $number) {
            $this->travel(1)->minutes();
            Storyfeed::activity('place', $thing(['name' => "Order #{$number}", 'kind' => 'order']))->by($erica)->to($scoops)->publish();
        }

        // 2. Five people checked in at the Fun Fair: some portraits, some initials.
        $this->travel(20)->minutes();
        $fair = $thing(['name' => 'Fun Fair', 'kind' => 'place']);
        foreach ([['Max Mayfield', 'a'], ['Lucas Sinclair', null], ['Will Byers', 'b'], ['Joyce Byers', null], ['Murray Bauman', 'c']] as [$name, $portrait]) {
            $this->travel(1)->minutes();
            Storyfeed::activity('check_in', $fair)->by($person($name, $portrait))->publish();
        }

        // 3. Steve added three menu items, each with a photo.
        $this->travel(20)->minutes();
        $steve = $person('Steve Harrington');
        $menu = $thing(['name' => 'Summer menu', 'kind' => 'menu']);
        foreach ([['Hot dog', 'hotdog'], ['Pretzel', 'pretzel'], ['Sundae', 'sundae']] as [$name, $photo]) {
            $this->travel(1)->minutes();
            Storyfeed::activity('add', $thing(['name' => $name, 'kind' => 'dish', 'photo' => $photo]))->by($steve)->to($menu)->publish();
        }

        // 4. A mixed group: five posts, the newest two with photos.
        $this->travel(20)->minutes();
        $robin = $person('Robin Buckley');
        $board = $thing(['name' => 'Notice board', 'kind' => 'board']);
        foreach ([['Shift rota', null], ['Lost and found', null], ['Staff picnic', 'fair'], ['Ferris wheel hours', 'ferris'], ['Closing checklist', null]] as [$name, $photo]) {
            $this->travel(1)->minutes();
            Storyfeed::activity('post', $thing(['name' => $name, 'kind' => 'post', 'photo' => $photo]))->by($robin)->to($board)->publish();
        }

        // 5. Products with icons only: declared media.icon, no photos.
        $this->travel(20)->minutes();
        $dustin = $person('Dustin Henderson');
        foreach ([['Waffle cones', 'cone'], ['Sprinkles', 'sprinkles'], ['Napkins', 'napkin'], ['Spoons', 'spoon']] as [$name, $icon]) {
            $this->travel(1)->minutes();
            Storyfeed::activity('restock', $thing(['name' => $name, 'kind' => 'product', 'icon' => $icon]))->by($dustin)->publish();
        }

        $items = json_decode((string) json_encode(Page::read(Storyfeed::feed()->live()->get())['items']), true, flags: JSON_THROW_ON_ERROR);
        $groups = array_values(array_filter($items, fn (array $item) => $item['kind'] === 'group'));
        $this->assertCount(5, $groups, 'every scene is one group');

        $names = ['place' => 'Erica placed 3 orders (no pictures)', 'check_in' => 'Several actors checked in at the Fun Fair', 'add' => 'Three menu items with photos', 'post' => 'A mixed group', 'restock' => 'Products with icons only'];
        $cases = [];
        foreach (array_keys($names) as $verb) {
            $group = current(array_filter($groups, fn (array $group) => $group['verb'] === $verb));
            $cases[] = ['name' => $names[$verb], 'items' => [$group]];
        }

        file_put_contents(__DIR__.'/strip-policy/cases.json', json_encode($cases, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR)."\n");
    }
}

/** An original flat head-and-shoulders portrait, a stand-in for a profile photo. */
function policy_portrait(string $variant): FeedImage
{
    [$bg, $skin, $hair, $shirt] = match ($variant) {
        'a' => ['#fde68a', '#f1c7a5', '#c2410c', '#0f766e'],
        'b' => ['#bfdbfe', '#e8b896', '#78350f', '#7c3aed'],
        default => ['#d9f99d', '#8d5a3b', '#1f2937', '#b91c1c'],
    };
    $svg = "<svg xmlns='http://www.w3.org/2000/svg' width='96' height='96' viewBox='0 0 96 96'><rect width='96' height='96' fill='{$bg}'/><path d='M14 96c2-20 16-30 34-30s32 10 34 30z' fill='{$shirt}'/><rect x='40' y='54' width='16' height='16' rx='6' fill='{$skin}'/><circle cx='48' cy='40' r='18' fill='{$skin}'/><path d='M29 40c0-14 8-22 19-22s19 8 19 22c-4-8-10-11-19-11s-15 3-19 11z' fill='{$hair}'/></svg>";

    return FeedImage::make('data:image/svg+xml,'.rawurlencode($svg), 'image/svg+xml', 96, 96);
}

/** An original product icon on a tinted square. */
function policy_icon(string $name): FeedImage
{
    $glyph = match ($name) {
        'cone' => "<path d='M22 26h20L32 54z' fill='#d97706'/><circle cx='32' cy='22' r='10' fill='#f9a8d4'/>",
        'sprinkles' => "<rect x='18' y='18' width='28' height='28' rx='14' fill='#fef3c7'/><path d='M24 26l4 2M36 24l2 4M30 36l4-1M38 38l-3 3M24 38l3 2' stroke='#db2777' stroke-width='3' stroke-linecap='round'/>",
        'napkin' => "<path d='M18 18h28v28H18z' fill='#fff' stroke='#64748b' stroke-width='2'/><path d='M18 18l28 28' stroke='#cbd5e1' stroke-width='2'/>",
        default => "<ellipse cx='32' cy='22' rx='8' ry='10' fill='#94a3b8'/><rect x='30' y='30' width='4' height='20' rx='2' fill='#94a3b8'/>",
    };
    $svg = "<svg xmlns='http://www.w3.org/2000/svg' width='64' height='64' viewBox='0 0 64 64'><rect width='64' height='64' fill='#e0f2fe'/>{$glyph}</svg>";

    return FeedImage::make('data:image/svg+xml,'.rawurlencode($svg), 'image/svg+xml', 64, 64, ucfirst($name));
}

class PolicyPerson extends Model implements Feedable
{
    use InteractsWithFeed;

    protected $table = 'policy_people';

    protected $guarded = [];

    public function toFeed(): FeedEntity
    {
        return FeedEntity::make(label: $this->name, data: ['photo' => $this->photo]);
    }

    public static function feedMedia(FeedContext $context): ?FeedMedia
    {
        $photo = $context->data('photo');

        return FeedMedia::make('/people/'.$context->key(), icon: $photo ? policy_portrait($photo) : null);
    }
}

class PolicyThing extends Model implements Feedable
{
    use InteractsWithFeed;

    protected $table = 'policy_things';

    protected $guarded = [];

    public function toFeed(): FeedEntity
    {
        return FeedEntity::make(label: $this->name, data: ['photo' => $this->photo, 'icon' => $this->icon], body: $this->photo ? Image::make($this->feedMediaPreview())->alt($this->name) : null);
    }

    public static function feedMedia(FeedContext $context): ?FeedMedia
    {
        $photo = $context->data('photo');
        $icon = $context->data('icon');

        return FeedMedia::make('/things/'.$context->key(),
            icon: $icon ? policy_icon($icon) : null,
            preview: $photo ? FeedImage::make("/workbench-media/{$photo}.jpg", 'image/jpeg', 192, 144) : null);
    }
}
