<?php

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\Relation;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Blade;
use Illuminate\Support\Facades\Schema;
use Storyfeed\Body\Image;
use Storyfeed\Concerns\InteractsWithFeed;
use Storyfeed\Contracts\Feedable;
use Storyfeed\Facades\Story;
use Storyfeed\Facades\Storyfeed;
use Storyfeed\FeedEntity;
use Storyfeed\FeedImage;
use Storyfeed\Support\FeedItem;
use Storyfeed\Ui\Support\Bodies;
use Storyfeed\Ui\Tests\TestCase;

final class ImageSizeProject extends Model implements Feedable
{
    use InteractsWithFeed;

    protected $guarded = [];

    public static ?string $size = null;

    public function toFeed(): FeedEntity
    {
        $body = Image::make(FeedImage::make('media/'.$this->photo, width: 1200, height: 900, alt: 'Street fair project cover'))->caption($this->note);
        if (self::$size !== null) {
            $body->size(self::$size);
        }

        return FeedEntity::make(label: $this->name, body: $body);
    }
}

final class PreviewTest extends TestCase
{
    public function test_render_image_sizes(): void
    {
        Relation::morphMap(['image-size-project' => ImageSizeProject::class]);
        Schema::create('image_size_projects', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('photo');
            $table->string('note');
            $table->timestamps();
        });
        Story::for(ImageSizeProject::class)->verb('update')->headline('Work continues on :object')->icon('image');
        $render = fn ($page, string $size = 'full') => Blade::render('<x-storyfeed::feed :page="$page" :image-size="$size" :grouped="false" rail="activity-only" :interactive="false" />', compact('page', 'size'));
        $samples = [];
        foreach (Image::SIZES as $size) {
            ImageSizeProject::$size = $size;
            $project = ImageSizeProject::create(['name' => 'Maple Street Fair', 'photo' => 'fair.jpg', 'note' => 'The new fair map is taking shape.']);
            Storyfeed::anonymous()->action('update', $project)->publish();
            $samples[$size] = $render(Storyfeed::feed()->log()->limit(1)->get());
        }
        ImageSizeProject::$size = null;
        foreach ([['River Lights', 'fireworks.jpg', 'Testing the opening-night lights.'], ['Maple Market', 'pretzels.jpg', 'Planning the next row of stalls.'], ['North Pier', 'ferris.jpg', 'A new route beside the river.'], ['Fairground Atlas', 'carousel.jpg', 'Mapping a day at the fair.']] as [$name, $photo, $note]) {
            $this->travel(1)->minutes();
            Storyfeed::anonymous()->action('update', ImageSizeProject::create(compact('name', 'photo', 'note')))->publish();
        }
        $page = Storyfeed::feed()->log()->limit(4)->get();
        $data = ['sizes' => $samples, 'card' => $render($page, 'card'), 'full' => $render($page)];
        $dir = dirname(__DIR__, 2).'/build/image-size';
        if (! is_dir($dir)) {
            mkdir($dir, 0755, true);
        }
        file_put_contents($dir.'/rows.json', json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR));
        file_put_contents($dir.'/classes.txt', html_entity_decode(implode("\n", [...array_values($samples), $data['card'], $data['full']])));
        $this->assertCount(5, $samples);
        $this->assertSame(4, substr_count($data['card'], '<article'));
    }

    public function test_render_custom_image_sizes(): void
    {
        $cases = [];
        foreach ([null, ...Bodies::IMAGE_SIZES, 'unknown'] as $size) {
            foreach (['portrait' => [800, 1200], 'wide' => [1600, 400], 'logo' => [40, 100], 'small' => [160, 120], 'undeclared' => [600, 200]] as $shape => [$width, $height]) {
                foreach ([false, true] as $linked) {
                    $svg = '<svg xmlns="http://www.w3.org/2000/svg" width="'.$width.'" height="'.$height.'"><rect width="100%" height="100%" fill="#527ac9"/></svg>';
                    $body = ['$body' => 'Storyfeed/Body/Image', '$v' => 3, 'src' => 'data:image/svg+xml,'.rawurlencode($svg), 'alt' => $shape, '$meta' => ['size' => $size]];
                    if ($shape !== 'undeclared') {
                        $body += compact('width', 'height');
                    }
                    $item = ['kind' => 'activity', 'id' => '1', 'verb' => null, 'published_at' => null, 'headline_template' => null, 'headline' => 'Maple Fair', 'object' => ['type' => 'project', 'id' => '1', 'url' => $linked ? '/project' : null, 'body' => [$body]]];
                    $renderer = function (array $body, $entity) use ($linked): string {
                        $image = Bodies::picture($body, $entity);
                        $href = $linked ? '/project' : null;

                        return Blade::render('<x-storyfeed::media :image="$image" :payload="$body" :href="$href" />', compact('image', 'body', 'href'));
                    };
                    $items = [FeedItem::of($item)];
                    $html = Blade::render('<x-storyfeed::feed :items="$items" image-size="card" :grouped="false" rail="activity-only" :renderers="[\'form\' => $renderer]" />', compact('items', 'renderer'));
                    $cases[] = ['size' => $size ?? 'inherit', ...compact('shape', 'width', 'height', 'linked', 'item', 'html')];
                }
            }
        }
        $dir = dirname(__DIR__, 2).'/build/image-size';
        if (! is_dir($dir)) {
            mkdir($dir, 0755, true);
        }
        file_put_contents($dir.'/media.json', json_encode($cases, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR));
        $this->assertCount(70, $cases);
    }
}
