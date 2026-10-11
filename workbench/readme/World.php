<?php

namespace Workbench\Readme;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Storyfeed\Body\Image;
use Storyfeed\Concerns\InteractsWithFeed;
use Storyfeed\Contracts\Feedable;
use Storyfeed\FeedContext;
use Storyfeed\FeedEntity;
use Storyfeed\FeedImage;
use Storyfeed\FeedMedia;
use Storyfeed\MediaSlot;

/*
 * The README showcase's worlds. Inside the picture: a made-up street fair and
 * the volunteers who run it. Around it: the feed of looks at Storyfeed's
 * README that the showcase pulls back to. Every name here is invented; the
 * photos are the workbench's Unsplash-licensed set (media/CREDITS.md).
 */

function migrate(): void
{
    Schema::create('members', fn (Blueprint $table) => [$table->id(), $table->string('name'), $table->timestamps()]);
    Schema::create('fairs', fn (Blueprint $table) => [$table->id(), $table->string('name'), $table->timestamps()]);
    Schema::create('bookings', fn (Blueprint $table) => [$table->id(), $table->string('number'), $table->timestamps()]);
    Schema::create('photos', fn (Blueprint $table) => [$table->id(), $table->string('file'), $table->timestamps()]);
    Schema::create('permits', fn (Blueprint $table) => [$table->id(), $table->string('number'), $table->timestamps()]);
}

function migrateLooks(): void
{
    Schema::create('projects', fn (Blueprint $table) => [$table->id(), $table->string('name'), $table->timestamps()]);
    Schema::create('docs', fn (Blueprint $table) => [$table->id(), $table->string('title'), $table->timestamps()]);
    Schema::create('visits', fn (Blueprint $table) => [$table->id(), $table->timestamps()]);
    Schema::create('readers', fn (Blueprint $table) => [$table->id(), $table->string('name'), $table->timestamps()]);
}

class Member extends Model implements Feedable
{
    use InteractsWithFeed;

    protected $guarded = [];

    public function toFeed(): FeedEntity
    {
        return FeedEntity::make(label: $this->name, data: ['id' => $this->id]);
    }

    public static function feedMedia(FeedContext $context): ?FeedMedia
    {
        return FeedMedia::make("/members/{$context->data('id')}");
    }
}

class Fair extends Model implements Feedable
{
    use InteractsWithFeed;

    protected $guarded = [];

    public function toFeed(): FeedEntity
    {
        return FeedEntity::make(label: $this->name, data: ['id' => $this->id]);
    }

    public static function feedMedia(FeedContext $context): ?FeedMedia
    {
        return FeedMedia::make("/fairs/{$context->data('id')}");
    }
}

class Booking extends Model implements Feedable
{
    use InteractsWithFeed;

    protected $guarded = [];

    public function toFeed(): FeedEntity
    {
        return FeedEntity::make(label: "Booking #{$this->number}", data: ['id' => $this->id]);
    }

    public static function feedMedia(FeedContext $context): ?FeedMedia
    {
        return FeedMedia::make("/bookings/{$context->data('id')}");
    }
}

class Photo extends Model implements Feedable
{
    use InteractsWithFeed;

    protected $guarded = [];

    /** The body the next snapshot carries; by default, the photo itself. */
    public static mixed $body = null;

    public function toFeed(): FeedEntity
    {
        return FeedEntity::make(label: 'a photo', data: ['id' => $this->id, 'file' => $this->file], body: static::$body ?? Image::make(MediaSlot::Preview, alt: 'A photo from the fair'));
    }

    public static function feedMedia(FeedContext $context): ?FeedMedia
    {
        return FeedMedia::make("/photos/{$context->data('id')}", preview: FeedImage::make("media/{$context->data('file')}", width: 160, height: 120, alt: 'A photo from the fair'));
    }
}

class Permit extends Model implements Feedable
{
    use InteractsWithFeed;

    protected $guarded = [];

    /** The body the next snapshot carries. */
    public static mixed $body = null;

    public function toFeed(): FeedEntity
    {
        return FeedEntity::make(label: "Permit #{$this->number}", data: ['id' => $this->id], body: static::$body);
    }

    public static function feedMedia(FeedContext $context): ?FeedMedia
    {
        return FeedMedia::make("/permits/{$context->data('id')}");
    }
}

class Project extends Model implements Feedable
{
    use InteractsWithFeed;

    protected $guarded = [];

    public function toFeed(): FeedEntity
    {
        return FeedEntity::make(label: $this->name, data: ['id' => $this->id]);
    }

    public static function feedMedia(FeedContext $context): ?FeedMedia
    {
        return FeedMedia::make('https://github.com/storyfeed/storyfeed');
    }
}

/** The README. Its picture is the showcase as a finished look leaves it. */
class Doc extends Model implements Feedable
{
    use InteractsWithFeed;

    protected $guarded = [];

    public function toFeed(): FeedEntity
    {
        return FeedEntity::make(label: $this->title, data: ['id' => $this->id], body: Image::make(MediaSlot::Preview, alt: 'The Storyfeed showcase, at its finished frame'));
    }

    public static function feedMedia(FeedContext $context): ?FeedMedia
    {
        return FeedMedia::make('https://github.com/storyfeed/storyfeed#readme', preview: FeedImage::make('media/showcase-finished.webp', width: 320, height: 208, alt: 'The Storyfeed showcase, at its finished frame'));
    }
}

/** A look still in progress: a visit to the README, with nothing to show yet. */
class Visit extends Model implements Feedable
{
    use InteractsWithFeed;

    protected $guarded = [];

    public function toFeed(): FeedEntity
    {
        return FeedEntity::make(label: 'a visit', data: ['id' => $this->id]);
    }

    public static function feedMedia(FeedContext $context): ?FeedMedia
    {
        return null;
    }
}

/** Whoever is reading the README: the page's viewer, drawn as "You". */
class Reader extends Model implements Feedable
{
    use InteractsWithFeed;

    protected $guarded = [];

    public function toFeed(): FeedEntity
    {
        return FeedEntity::make(label: $this->name, data: ['id' => $this->id]);
    }

    public static function feedMedia(FeedContext $context): ?FeedMedia
    {
        return null;
    }
}
