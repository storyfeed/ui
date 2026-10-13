<?php

use Illuminate\Support\Facades\Blade;
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
        $body = ['$body' => 'Storyfeed/Body/Image', '$v' => 3, 'src' => '/fair.jpg', '$meta' => ['size' => $size]];
        expect(render_image_size('<x-storyfeed::body :body="$body" />', compact('body')))
            ->toContain('[--sf-image-width:var(--sf-image-size-'.$size.','.$width.')]', '[--sf-image-height:var(--sf-image-size-'.$size.'-height,'.$height.')]')
            ->not->toContain('style=');
    }
    $body = ['$body' => 'Storyfeed/Body/Image', '$v' => 3, 'src' => '/fair.jpg'];
    expect(render_image_size('<x-storyfeed::body :body="$body" />', compact('body')))->not->toContain('[--sf-image-width:', 'style=');
    $items = [FeedItem::of(['kind' => 'activity', 'headline' => 'Updated Maple Fair', 'object' => ['type' => 'project', 'id' => '1', 'label' => 'Maple Fair', 'body' => [$body]]])];
    expect(render_image_size('<x-storyfeed::feed :items="$items" image-size="card" />', compact('items')))->toContain('--sf-image-size-card,24rem)')->not->toContain('--sf-image-size-full,100%)');
    $items[0] = FeedItem::of(['kind' => 'activity', 'headline' => 'Updated Maple Fair', 'object' => ['type' => 'project', 'id' => '1', 'body' => [['$body' => 'Storyfeed/Body/Image', '$v' => 3, 'src' => '/fair.jpg', '$meta' => ['size' => 'full']]]]]);
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
    $object = ['type' => 'project', 'id' => '1', 'label' => 'Maple Fair', 'media' => ['icon' => ['src' => '/fair.jpg', 'width' => 1200, 'height' => 800]], 'body' => [['$body' => 'Storyfeed/Body/Image', '$v' => 3, 'image' => 'icon']]];
    $items = [FeedItem::of(['kind' => 'activity', 'headline' => 'Maple Fair', 'object' => $object])];
    expect(render_image_size('<x-storyfeed::feed :items="$items" image-size="card" />', compact('items')))->toContain('<figure', '/fair.jpg');
    expect(render_image_size('<x-storyfeed::feed :items="$items" />', compact('items')))->not->toContain('<figure');
    $object['body'] = [['$body' => 'Storyfeed/Body/Image', '$v' => 3, 'image' => 'icon', '$meta' => ['size' => 'full']]];
    $items = [FeedItem::of(['kind' => 'activity', 'headline' => 'Maple Fair', 'object' => $object])];
    expect(render_image_size('<x-storyfeed::feed :items="$items" image-size="card" />', compact('items')))->toContain('<figure', '--sf-image-size-full,100%)');
});

it('lets a custom Image renderer reuse media sizing and keep its link', function () {
    $renderer = function (array $body, $entity): string {
        $image = Bodies::picture($body, $entity);

        return Blade::render('<x-storyfeed::media :image="$image" :payload="$body" href="/project" />', compact('image', 'body'));
    };
    foreach ([null, 'thumbnail', 'inline', 'card', 'feature', 'full', 'unknown'] as $size) {
        $body = ['$body' => 'Storyfeed/Body/Image', '$v' => 3, 'src' => '/fair.jpg', 'width' => 800, 'height' => 1200, '$meta' => ['size' => $size]];
        $items = [FeedItem::of(['kind' => 'activity', 'headline' => 'Maple Fair', 'object' => ['type' => 'project', 'id' => '1', 'body' => [$body]]])];
        $html = render_image_size('<x-storyfeed::feed :items="$items" image-size="card" :renderers="[\'form\' => $renderer]" />', compact('items', 'renderer'));
        expect($html)->toContain('<a href="/project"', '--sf-image-size-card,24rem)', 'max-h-[var(--sf-image-height,none)]')
            ->not->toContain('aspect-ratio', 'payload=');
        if ($size !== null && $size !== 'unknown') {
            expect($html)->toContain('--sf-image-size-'.$size.',');
        }
    }
});
