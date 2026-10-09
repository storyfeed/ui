<?php

namespace Storyfeed\Ui\Tests\Fixtures;

use Illuminate\Database\Eloquent\Model;
use Storyfeed\Concerns\InteractsWithFeed;
use Storyfeed\Contracts\Feedable;
use Storyfeed\Contracts\FeedBody;
use Storyfeed\FeedContext;
use Storyfeed\FeedEntity;
use Storyfeed\FeedImage;
use Storyfeed\FeedLink;
use Storyfeed\FeedMedia;

/**
 * @property int $id
 * @property string $number
 */
class Order extends Model implements Feedable
{
    use InteractsWithFeed;

    /**
     * Test hook: the bodies this order's snapshot carries.
     *
     * @var FeedBody|iterable<mixed>|null
     */
    public static FeedBody|iterable|null $body = null;

    /** Test hook: the preview image the resolver mints. */
    public static ?FeedImage $preview = null;

    protected $guarded = [];

    public function toFeed(): FeedEntity
    {
        return FeedEntity::make(label: "Order #{$this->number}", data: ['id' => $this->id], body: static::$body);
    }

    public static function feedMedia(FeedContext $context): ?FeedMedia
    {
        $href = "/orders/{$context->data('id')}";

        // Core 0.17 puts the attributes on the link (storyfeed/storyfeed#79); 0.16 takes them on the media.
        return method_exists(FeedLink::class, 'to')
            ? FeedMedia::make(link: FeedLink::to($href)->attributes(['target' => '_blank']), preview: static::$preview)
            : FeedMedia::make($href, attributes: ['target' => '_blank'], preview: static::$preview);
    }
}
