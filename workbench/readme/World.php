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
 * The README showcase's world: a made-up street fair and the volunteers who
 * run it. Every name here is invented; the photos are the workbench's
 * Unsplash-licensed set (media/CREDITS.md).
 */

function migrate(): void
{
    Schema::create('members', fn (Blueprint $table) => [$table->id(), $table->string('name'), $table->timestamps()]);
    Schema::create('fairs', fn (Blueprint $table) => [$table->id(), $table->string('name'), $table->timestamps()]);
    Schema::create('bookings', fn (Blueprint $table) => [$table->id(), $table->string('number'), $table->timestamps()]);
    Schema::create('photos', fn (Blueprint $table) => [$table->id(), $table->string('file'), $table->timestamps()]);
    Schema::create('permits', fn (Blueprint $table) => [$table->id(), $table->string('number'), $table->timestamps()]);
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
