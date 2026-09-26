{{--
    Storyfeed/Body/MediaObject: a post. A subject line, some prose, one
    picture, its files and a footnote.

    The body stores no image. `image` names one of the entity's media slots,
    minted when the feed is read, so the picture is always the current one.
    The subject is left out when the headline already says it.
--}}
@props(['body', 'entity' => null])

@php
    $link = fn ($value): ?array => match (true) {
        is_string($value) && $value !== '' => ['label' => $value, 'href' => null],
        is_array($value) && filled($value['label'] ?? $value['href'] ?? null) => ['label' => $value['label'] ?? $value['href'], 'href' => $value['href'] ?? null],
        default => null,
    };

    $subject = $link($body['subject'] ?? null);
    $subject = $subject !== null && $subject['label'] !== $entity?->label() ? $subject : null;
    $footnote = $link($body['footnote'] ?? null);
    $imageSlot = is_string($body['image'] ?? null) ? $body['image'] : null;
    $picture = $imageSlot !== null ? $entity?->media()?->get($imageSlot) : null;
    $attachments = collect($body['attachments'] ?? [])->filter(fn ($file) => is_array($file) && filled($file['href'] ?? null));
@endphp

<div {{ $attributes->class('sf-media-object') }}>
    @if ($subject)
        <p class="sf-media-object__subject">
            @if ($subject['href'])<a href="{{ $subject['href'] }}">{{ $subject['label'] }}</a>@else{{ $subject['label'] }}@endif
        </p>
    @endif

    @if (filled($body['content'] ?? null))
        <p class="sf-prose">{{ $body['content'] }}</p>
    @endif

    @if (is_array($picture))
        <x-storyfeed::media :image="$picture" />
    @endif

    @foreach ($attachments as $file)
        <p class="sf-file"><a href="{{ $file['href'] }}">{{ $file['name'] ?? $file['href'] }}</a>@if (filled($file['mediaType'] ?? null)) · {{ $file['mediaType'] }}@endif</p>
    @endforeach

    @if ($footnote)
        <p class="sf-media-object__footnote">
            @if ($footnote['href'])<a href="{{ $footnote['href'] }}">{{ $footnote['label'] }}</a>@else{{ $footnote['label'] }}@endif
        </p>
    @endif
</div>
