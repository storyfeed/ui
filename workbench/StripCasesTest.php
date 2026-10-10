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
use Storyfeed\Ui\Tests\TestCase;

/**
 * The group strip samples, as core writes them (ui#27).
 *
 * Publishes four realistic scenes through core, reads them back as a live
 * feed and stores each group in `vue/cases.json` as a "Strip: …" case, so the
 * Blade, Vue and React workbenches all draw the same core output. Needs core
 * 0.18 (every entity has an avatar, storyfeed/storyfeed#92); regenerate with
 * `npm run workbench:strip-cases` after installing core main.
 */
final class StripCasesTest extends TestCase
{
    public function test_write_strip_cases(): void
    {
        if (! method_exists(InteractsWithFeed::class, 'feedMediaPreview')) {
            $this->markTestSkipped('The strip samples need core 0.18.');
        }

        $this->travelTo(now()->setDate(2026, 8, 14)->startOfDay()->addHours(12));

        foreach (['strip_people' => 'name', 'strip_projects' => 'name', 'strip_files' => 'name'] as $table => $column) {
            Schema::create($table, function ($blueprint) use ($column) {
                $blueprint->id();
                $blueprint->string($column);
                $blueprint->string('kind')->nullable();
                $blueprint->string('photo')->nullable();
                $blueprint->timestamps();
            });
        }

        Relation::enforceMorphMap([...Relation::morphMap(), 'person' => StripPerson::class, 'project' => StripProject::class, 'file' => StripFile::class]);

        Story::for(StripPerson::class)->verb('add')->headline(':actor added :object to :target')->icon('user-plus')
            ->grouped(fn ($group) => $group->repeat(':actor added :count people to :target'));
        Story::verb('upload')->headline(':actor uploaded :object to :target')->icon('image')
            ->grouped(fn ($group) => $group->repeat(':actor uploaded :count photos to :target'));
        Story::verb('share')->headline(':actor shared :object in :target')->icon('file-up')
            ->grouped(fn ($group) => $group->repeat(':actor shared :count files in :target'));

        $person = fn (string $name, ?string $photo = null) => StripPerson::create(['name' => $name, 'photo' => $photo]);
        [$ana, $ben, $cara, $dev] = [$person('Ana Silva'), $person('Ben Okafor', 'carousel'), $person('Cara Lindqvist'), $person('Dev Patel', 'ferris')];
        $kitchen = StripProject::create(['name' => 'Kitchen remodel']);
        $fair = StripProject::create(['name' => 'Summer fair']);
        $launch = StripProject::create(['name' => 'Launch plan']);

        // 1. Ana added 6 people to a project: some with photos, the rest derived initials.
        $added = [$person('Fay Laurent'), $person('Hugo Martin'), $person('Jon Bauer'), $person('Eli Brooks', 'arcade'), $person('Iris Novak'), $person('Gia Romano', 'parlour')];
        foreach ($added as $i => $member) {
            $this->travel(1)->minutes();
            Storyfeed::activity('add', $member)->by($ana)->to($kitchen)->publish();
        }

        // 2. Ben uploaded 9 photos to an album.
        $this->travel(20)->minutes();
        foreach (['fair', 'fireworks', 'ferris', 'carousel', 'pretzel', 'hotdog', 'sundae', 'arcade', 'street'] as $i => $photo) {
            $this->travel(1)->minutes();
            Storyfeed::activity('upload', StripFile::create(['name' => "IMG_40{$i}2.jpg", 'kind' => 'photo', 'photo' => $photo]))->by($ben)->to($fair)->publish();
        }

        // 3. A mixed group: a photo, a PDF, a note.
        $this->travel(20)->minutes();
        foreach ([['name' => 'Cabinet mock-up.jpg', 'kind' => 'photo', 'photo' => 'newspapers'], ['name' => 'Quote from the electrician.pdf', 'kind' => 'pdf'], ['name' => 'Measurements', 'kind' => 'note']] as $file) {
            $this->travel(1)->minutes();
            Storyfeed::activity('share', StripFile::create($file))->by($cara)->to($kitchen)->publish();
        }

        // 4. A two-member group.
        $this->travel(20)->minutes();
        foreach (['pretzels', 'fireworks'] as $i => $photo) {
            $this->travel(1)->minutes();
            Storyfeed::activity('upload', StripFile::create(['name' => "IMG_51{$i}0.jpg", 'kind' => 'photo', 'photo' => $photo]))->by($dev)->to($launch)->publish();
        }

        $items = Storyfeed::feed()->live()->get()->toArray()['items'];
        $groups = array_values(array_filter($items, fn (array $item) => $item['kind'] === 'group'));
        $this->assertCount(4, $groups, 'every scene is one group');

        $names = ['Ana' => 'Strip: people added to a project', 'Ben' => 'Strip: photos uploaded to an album', 'Cara' => 'Strip: a mixed group', 'Dev' => 'Strip: a two-member group'];
        $strip = [];
        foreach ($groups as $group) {
            $actor = strtok($group['sample']['actors'][0]['label'], ' ');
            $strip[$names[$actor]] = ['name' => $names[$actor], 'rail' => 'actor', 'collapsed' => true, 'items' => [$group]];
        }

        $path = __DIR__.'/vue/cases.json';
        // Read as objects, so the other cases write back exactly as they were.
        $cases = array_values(array_filter(json_decode(file_get_contents($path), flags: JSON_THROW_ON_ERROR), fn (object $case) => ! str_starts_with($case->name, 'Strip: ')));
        foreach ($names as $name) {
            $cases[] = $strip[$name];
        }
        // The file's own format: two-space indents, so only the strip cases change.
        $json = json_encode($cases, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
        file_put_contents($path, preg_replace_callback('/^ +/m', fn (array $indent) => str_repeat(' ', intdiv(strlen($indent[0]), 2)), $json)."\n");
    }
}

/** A photograph from the docs world set; `npm run workbench` copies them to `build/workbench-media/`. */
function strip_photo(string $name): FeedImage
{
    return FeedImage::make("/workbench-media/{$name}.jpg", 'image/jpeg', 192, 144);
}

class StripPerson extends Model implements Feedable
{
    use InteractsWithFeed;

    protected $table = 'strip_people';

    protected $guarded = [];

    public function toFeed(): FeedEntity
    {
        return FeedEntity::make(label: $this->name, data: ['photo' => $this->photo]);
    }

    public static function feedMedia(FeedContext $context): ?FeedMedia
    {
        $photo = $context->data('photo');

        // No photo: core derives the initials and colour.
        return FeedMedia::make('/people/'.$context->key(), icon: $photo ? strip_photo($photo) : null);
    }
}

class StripProject extends Model implements Feedable
{
    use InteractsWithFeed;

    protected $table = 'strip_projects';

    protected $guarded = [];

    public function toFeed(): FeedEntity
    {
        return FeedEntity::make(label: $this->name);
    }

    public static function feedMedia(FeedContext $context): ?FeedMedia
    {
        return FeedMedia::make('/projects/'.$context->key());
    }
}

class StripFile extends Model implements Feedable
{
    use InteractsWithFeed;

    protected $table = 'strip_files';

    protected $guarded = [];

    public function toFeed(): FeedEntity
    {
        // A photo shows itself; other files show their icon, or the derived avatar.
        return FeedEntity::make(label: $this->name, data: ['kind' => $this->kind, 'photo' => $this->photo], body: $this->kind === 'photo' ? Image::make($this->feedMediaPreview())->alt($this->name) : null);
    }

    public static function feedMedia(FeedContext $context): ?FeedMedia
    {
        $pdf = 'data:image/svg+xml,'.rawurlencode('<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><rect width="64" height="64" fill="#b91c1c"/><path d="M20 12h17l11 11v29H20z" fill="#fff"/><path d="M37 12v11h11" fill="#fecaca"/><text x="34" y="45" font-family="Arial,sans-serif" font-size="11" font-weight="700" fill="#b91c1c" text-anchor="middle">PDF</text></svg>');

        return FeedMedia::make('/files/'.$context->key(),
            icon: $context->data('kind') === 'pdf' ? FeedImage::make($pdf, 'image/svg+xml', 64, 64, 'PDF') : null,
            preview: $context->data('photo') ? strip_photo($context->data('photo')) : null);
    }
}
