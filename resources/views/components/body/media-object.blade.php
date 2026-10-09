{{--
    Storyfeed/Body/MediaObject: a post. A subject line, some prose, one
    picture, its files and a footnote.

    The body stores no image. `image` names one of the entity's media slots,
    minted when the feed is read, so the picture is always the current one.
    The supplied subject titles the card independently of the headline.
--}}
@props(['body', 'entity' => null, 'mediaRenderer' => null, 'imagePlacement' => 'beside'])

@php
    $body = \Storyfeed\Body\MediaObject::upgrade($body, is_int($body['$v'] ?? null) ? $body['$v'] : 1);
    $link = fn ($value): ?array => match (true) {
        is_string($value) && $value !== '' => ['label' => $value, 'href' => null],
        is_array($value) && filled($value['label'] ?? $value['href'] ?? null) => ['label' => $value['label'] ?? $value['href'], 'href' => $value['href'] ?? $entity?->url()],
        default => null,
    };

    $subject = $link($body['subject'] ?? null);
    $footnote = $link($body['footnote'] ?? null);
    $imageSlot = is_string($body['image'] ?? null) ? $body['image'] : null;
    $picture = in_array($imageSlot, ['icon', 'preview', 'image'], true) ? $entity?->media()?->get($imageSlot) : null;
    $files = collect($body['files'] ?? [])->filter(fn ($file) => is_array($file) && filled($file['href'] ?? null));
@endphp
@if ($subject || filled($body['content'] ?? null) || is_array($picture) || $files->isNotEmpty())
<div {{ $attributes->class('sf-media-object mt-1.5 flex min-w-0 max-w-128 items-start gap-3 rounded-lg border border-border bg-muted p-3') }}>
@if (is_array($picture) && $imagePlacement === 'beside')
        <div class="sf-media-object__image w-16 flex-none [&>div]:mt-0! [&>div]:size-16! [&>div]:rounded-md!"><x-storyfeed::media :image="$picture" :renderer="$mediaRenderer" /></div>
@endif
    <div class="sf-media-object__body flex min-w-0 flex-1 flex-col gap-1 [overflow-wrap:anywhere]">
@if ($subject)
            <p class="sf-media-object__subject m-0 text-base font-medium text-foreground">
@if ($subject['href'])<a class="font-medium text-foreground underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-ring" href="{{ $subject['href'] }}">{{ $subject['label'] }}</a>
@else{{ $subject['label'] }}
@endif
            </p>
@endif

@if (filled($body['content'] ?? null))
            <p class="sf-prose m-0 text-base leading-[1.6] whitespace-pre-wrap sf-media-object__content line-clamp-3 text-muted-foreground">{{ $body['content'] }}</p>
@endif

@if (is_array($picture) && $imagePlacement === 'below')
            <x-storyfeed::media :image="$picture" :renderer="$mediaRenderer" />
        @endif
@if ($files->isNotEmpty())
        <ul class="sf-media-object__attachments mt-0.5 mb-0 flex list-none flex-col gap-0.5 p-0">
@foreach ($files as $file)
            <li class="sf-file m-0 text-base text-muted-foreground"><a class="font-medium text-foreground underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-ring" href="{{ $file['href'] }}">{{ $file['name'] ?? $file['href'] }}</a>
@if (filled($file['mediaType'] ?? null)) · {{ $file['mediaType'] }}
@endif</li>
@endforeach
        </ul>
@endif

@if ($footnote)
            <p class="sf-media-object__footnote mt-0.5 mb-0 text-sm leading-[1.6] text-muted-foreground">
@if ($footnote['href'])<a class="font-medium text-foreground underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-ring" href="{{ $footnote['href'] }}">{{ $footnote['label'] }}</a>
@else{{ $footnote['label'] }}
@endif
            </p>
@endif
    </div>
</div>
@elseif ($footnote)
<p {{ $attributes->class('sf-media-object__footnote mt-0.5 mb-0 text-sm leading-[1.6] text-muted-foreground') }}>
@if ($footnote['href'])<a class="font-medium text-foreground underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-ring" href="{{ $footnote['href'] }}">{{ $footnote['label'] }}</a>
@else{{ $footnote['label'] }}
@endif
</p>
@endif
