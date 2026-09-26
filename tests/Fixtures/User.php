<?php

namespace Storyfeed\Ui\Tests\Fixtures;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Storyfeed\Concerns\InteractsWithFeed;
use Storyfeed\Contracts\Feedable;
use Storyfeed\FeedContext;
use Storyfeed\FeedEntity;
use Storyfeed\FeedMedia;

class User extends Authenticatable implements Feedable
{
    use InteractsWithFeed;

    protected $guarded = [];

    public function toFeed(): FeedEntity
    {
        return FeedEntity::make(label: $this->name, data: ['id' => $this->id]);
    }

    public static function feedMedia(FeedContext $context): ?FeedMedia
    {
        return FeedMedia::make("/users/{$context->data('id')}");
    }
}
