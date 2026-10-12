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
        file_put_contents($dir.'/rows.json', json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR));
        file_put_contents($dir.'/classes.txt', html_entity_decode(implode("\n", [...array_values($samples), $data['card'], $data['full']])));
        $this->assertCount(5, $samples);
        $this->assertSame(4, substr_count($data['card'], '<article'));
    }
}
