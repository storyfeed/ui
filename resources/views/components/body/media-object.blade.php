{{--
    Storyfeed/Body/MediaObject: a post. A subject line, some prose, one
    picture, its files and a footnote.

    The body stores no image. `image` names one of the entity's media slots,
    minted when the feed is read, so the picture is always the current one.
    The supplied subject titles the card independently of the headline.
--}}
@props(['body', 'entity' => null])

@php
    $body = \Storyfeed\Body\MediaObject::upgrade($body, is_int($body['$v'] ?? null) ? $body['$v'] : 1);
    $link = fn ($value): ?array => match (true) {
        is_string($value) && $value !== '' => ['label' => $value, 'href' => null],
        is_array($value) && filled($value['label'] ?? $value['href'] ?? null) => ['label' => $value['label'] ?? $value['href'], 'href' => $value['href'] ?? null],
        default => null,
    };

    $subject = $link($body['subject'] ?? null);
    $footnote = $link($body['footnote'] ?? null);
    $imageSlot = is_string($body['image'] ?? null) ? $body['image'] : null;
    $picture = $imageSlot !== null ? $entity?->media()?->get($imageSlot) : null;
    $files = collect($body['files'] ?? [])->filter(fn ($file) => is_array($file) && filled($file['href'] ?? null));
@endphp

<div {{ $attributes->class('sf-media-object') }}>
    @if (is_array($picture))
        <div class="sf-media-object__image"><x-storyfeed::media :image="$picture" /></div>
    @endif
    <div class="sf-media-object__body">
        @if ($subject)
            <p class="sf-media-object__subject">
                @if ($subject['href'])<a href="{{ $subject['href'] }}">{{ $subject['label'] }}</a>@else{{ $subject['label'] }}@endif
            </p>
        @endif

        @if (filled($body['content'] ?? null))
            <p class="sf-prose sf-media-object__content">{{ $body['content'] }}</p>
        @endif

        @if ($files->isNotEmpty())
        <ul class="sf-media-object__attachments">
        @foreach ($files as $file)
            <li class="sf-file"><a href="{{ $file['href'] }}">{{ $file['name'] ?? $file['href'] }}</a>@if (filled($file['mediaType'] ?? null)) · {{ $file['mediaType'] }}@endif</li>
        @endforeach
        </ul>
        @endif

        @if ($footnote)
            <p class="sf-media-object__footnote">
                @if ($footnote['href'])<a href="{{ $footnote['href'] }}">{{ $footnote['label'] }}</a>@else{{ $footnote['label'] }}@endif
            </p>
        @endif
    </div>
</div>
