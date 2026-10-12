<?php

use Illuminate\Support\Facades\Blade;
use Storyfeed\Body\Image;
use Storyfeed\MediaSlot;
use Storyfeed\Support\FeedItem;
use Storyfeed\Ui\Support\Bodies;

/** Preserve utility classes when checking rendered image-size choices. */
function render_image_size(string $template, array $data): string
{
    return Blade::render($template, $data);
}

it('renders every image size and the feed default without changing the absent body choice', function () {
    $lengths = ['thumbnail' => ['6rem', '6rem'], 'inline' => ['16rem', '12rem'], 'card' => ['24rem', '18rem'], 'feature' => ['36rem', '27rem'], 'full' => ['100%', 'none']];
    foreach (Bodies::IMAGE_SIZES as $size) {
        [$width, $height] = $lengths[$size];
        $body = [...Image::make('/fair.jpg')->toPayload(), '$meta' => ['size' => $size]];
        expect(render_image_size('<x-storyfeed::body :body="$body" />', compact('body')))
            ->toContain('[--sf-image-width:var(--sf-image-size-'.$size.','.$width.')]', '[--sf-image-height:var(--sf-image-size-'.$size.'-height,'.$height.')]')
            ->not->toContain('style=');
    }
    $body = Image::make('/fair.jpg')->toPayload();
    expect(render_image_size('<x-storyfeed::body :body="$body" />', compact('body')))->not->toContain('[--sf-image-width:', 'style=');
    $items = [FeedItem::of(['kind' => 'activity', 'headline' => 'Updated Maple Fair', 'object' => ['type' => 'project', 'id' => '1', 'label' => 'Maple Fair', 'body' => [$body]]])];
    expect(render_image_size('<x-storyfeed::feed :items="$items" image-size="card" />', compact('items')))->toContain('--sf-image-size-card,24rem)')->not->toContain('--sf-image-size-full,100%)');
    $items[0] = FeedItem::of(['kind' => 'activity', 'headline' => 'Updated Maple Fair', 'object' => ['type' => 'project', 'id' => '1', 'body' => [[...Image::make('/fair.jpg')->toPayload(), '$meta' => ['size' => 'full']]]]]);
    expect(render_image_size('<x-storyfeed::feed :items="$items" image-size="card" />', compact('items')))->toContain('--sf-image-size-card,24rem)', '--sf-image-size-full,100%)');
    expect(render_image_size('<x-storyfeed::feed :items="$items" />', compact('items')))->toContain('--sf-image-size-full,100%)');
});

it('ignores malformed size metadata and does not interpolate arbitrary CSS', function () {
    foreach ([[], false, 'bad);color:red', 'CARD'] as $size) {
        $body = ['$body' => 'Storyfeed/Body/Image', '$v' => 3, 'src' => '/fair.jpg', '$meta' => ['size' => $size]];
        expect(render_image_size('<x-storyfeed::body :body="$body" />', compact('body')))->not->toContain('[--sf-image-width:', 'style=');
    }
});

it('honours the feed choice on an image naming the icon slot', function () {
    $object = ['type' => 'project', 'id' => '1', 'label' => 'Maple Fair', 'media' => ['icon' => ['src' => '/fair.jpg', 'width' => 1200, 'height' => 800]], 'body' => [Image::make(MediaSlot::Icon)->toPayload()]];
    $items = [FeedItem::of(['kind' => 'activity', 'headline' => 'Maple Fair', 'object' => $object])];
    expect(render_image_size('<x-storyfeed::feed :items="$items" image-size="card" />', compact('items')))->toContain('<figure', '/fair.jpg');
    expect(render_image_size('<x-storyfeed::feed :items="$items" />', compact('items')))->not->toContain('<figure');
    $object['body'] = [[...Image::make(MediaSlot::Icon)->toPayload(), '$meta' => ['size' => 'full']]];
    $items = [FeedItem::of(['kind' => 'activity', 'headline' => 'Maple Fair', 'object' => $object])];
    expect(render_image_size('<x-storyfeed::feed :items="$items" image-size="card" />', compact('items')))->toContain('<figure', '--sf-image-size-full,100%)');
});
