<?php

use Storyfeed\Contracts\FeedDetail;
use Storyfeed\MediaSlot;
use Storyfeed\Ui\Data\MediaObject;

it('stores a slot name and no image, because the resolver mints the picture at read time', function () {
    $detail = MediaObject::make(
        subject: 'N201 Saffron Butter Rice',
        content: 'Basmati replaces Jasmine.',
        image: MediaSlot::Icon,
    );

    $expected = [
        '$detail' => 'Storyfeed/MediaObject',
        '$v' => 1,
        'subject' => 'N201 Saffron Butter Rice',
        'content' => 'Basmati replaces Jasmine.',
        'image' => 'icon',
        'attachments' => false,
    ];

    // No src, no mediaType, no width, no height, no alt: the FeedImage that
    // feedMedia() mints carries all of them, and a copy here would age.
    expect($detail)->toBeInstanceOf(FeedDetail::class)
        ->and($detail->toArray())->toBe($expected)
        ->and($detail->toPayload())->toBe($expected)
        ->and(array_keys($detail->toPayload()))->not->toContain('src', 'url', 'width', 'height', 'alt', 'mediaType');

    $stored = json_decode(json_encode($detail->toArray(), JSON_THROW_ON_ERROR), true, flags: JSON_THROW_ON_ERROR);
    $props = array_diff_key($stored, array_flip([FeedDetail::KEY, FeedDetail::VERSION]));

    expect(MediaObject::upgrade($props, $stored[FeedDetail::VERSION]))
        ->toBe(['subject' => 'N201 Saffron Butter Rice', 'content' => 'Basmati replaces Jasmine.', 'image' => 'icon', 'attachments' => false]);
});

it('is all-optional, so a block with only attachments is a file list and no second form is needed', function () {
    expect(MediaObject::make()->toPayload())
        ->toBe(['$detail' => MediaObject::name(), '$v' => 1, 'subject' => null, 'content' => null, 'image' => null, 'attachments' => false])
        ->and(MediaObject::make(attachments: true)->toPayload()['attachments'])->toBeTrue()
        ->and(MediaObject::make(subject: 'Minutes', content: 'Two items carried.')->toPayload()['image'])->toBeNull();
});

it('produces a byte-identical row from the fluent form, which is sugar and not a second form', function () {
    $fluent = MediaObject::make(subject: 'N201', content: 'Basmati.')->withIcon()->withAttachments();
    $named = MediaObject::make(subject: 'N201', content: 'Basmati.', image: MediaSlot::Icon, attachments: true);

    expect(json_encode($fluent->toArray()))->toBe(json_encode($named->toArray()))
        ->and(MediaObject::make()->withPreview()->toPayload()['image'])->toBe('preview')
        ->and(MediaObject::make()->withImage()->toPayload()['image'])->toBe('image');
});

it('names at most one slot, and a second one throws rather than replacing the first', function () {
    // A block naming two slots is a block asking to be drawn twice. Last-wins
    // would turn the mistake into a silent layout at the one moment the
    // author is present to hear about it.
    expect(fn () => MediaObject::make(image: MediaSlot::Icon)->withImage())
        ->toThrow(LogicException::class, 'already names `icon`')
        ->and(fn () => MediaObject::make()->withPreview()->withPreview())
        ->toThrow(LogicException::class);

    // Attachments are not a slot; adding them after a slot is fine.
    expect(MediaObject::make()->withIcon()->withAttachments()->toPayload()['image'])->toBe('icon');
});

it('normalizes malformed and unknown-version payloads without throwing', function () {
    $blank = ['subject' => null, 'content' => null, 'image' => null, 'attachments' => false];

    foreach ([1, 0, 999] as $version) {
        expect(MediaObject::upgrade(['subject' => 'A', 'content' => 'B', 'image' => 'preview', 'attachments' => true, 'src' => 'stale'], $version))
            ->toBe(['subject' => 'A', 'content' => 'B', 'image' => 'preview', 'attachments' => true]);

        foreach ([[], ['subject' => 3, 'content' => [], 'image' => 7, 'attachments' => 'yes']] as $payload) {
            expect(MediaObject::upgrade($payload, $version))->toBe($blank);
        }
    }

    // A slot this vocabulary never issued — `url`, which is never a slot, or
    // a case a later version adds — draws the text and no picture.
    foreach (['url', 'hero', ''] as $unknown) {
        expect(MediaObject::upgrade(['image' => $unknown], 1)['image'])->toBeNull();
    }
});
