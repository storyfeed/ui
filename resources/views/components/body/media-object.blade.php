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
    // A string leads nowhere; a link goes to its href, or to the entity's own.
    $link = function (mixed $value) use ($entity): ?array {
        if (is_string($value) && $value !== '') {
            return ['label' => $value, 'href' => null, 'attributes' => []];
        }
        if (! is_array($value) || ! filled($value['label'] ?? $value['href'] ?? null)) {
            return null;
        }
        $to = \Storyfeed\Ui\Support\Links::body($value, $entity);

        return ['label' => $value['label'] ?? $value['href'], 'href' => $to['href'] ?? null, 'attributes' => $to['attributes'] ?? []];
    };

    $subject = $link($body['subject'] ?? null);
    $footnote = $link($body['footnote'] ?? null);
    $imageSlot = is_string($body['image'] ?? null) ? $body['image'] : null;
    $picture = in_array($imageSlot, ['icon', 'preview', 'image'], true) ? $entity?->media()?->get($imageSlot) : null;
    // Beside the text, a picture keeps its own shape: an icon is square, a
    // declared size keeps its ratio clamped to 1:1–2:1, and an undeclared one
    // shows whole at a fixed width. Mirrors `shared/picture.ts`.
    $width = $picture['width'] ?? null;
    $height = $picture['height'] ?? null;
    $ratio = $imageSlot !== 'icon' && (is_int($width) || is_float($width)) && (is_int($height) || is_float($height)) && $width > 0 && $height > 0
        ? round(min(max($width / $height, 1), 2), 4)
        : null;
    [$frame, $frameMedia] = match (true) {
        $imageSlot === 'icon' => ['sf-media-object__image w-16 flex-none', 'mt-0! size-16! rounded-md!'],
        $ratio !== null => ['sf-media-object__image h-16 w-[calc(--spacing(16)*var(--sf-picture-ratio))] flex-none', 'mt-0! size-full! max-w-none! aspect-auto! rounded-md!'],
        default => ['sf-media-object__image w-24 flex-none', 'mt-0! w-full! max-w-none! rounded-md! [&_img]:h-auto! [&_img]:max-h-32 [&_img]:object-contain!'],
    };
    $files = collect($body['files'] ?? [])->filter(fn ($file) => is_array($file) && filled($file['href'] ?? null));
@endphp
@if ($subject || filled($body['content'] ?? null) || is_array($picture) || $files->isNotEmpty())
<div {{ $attributes->class('sf-media-object mt-1.5 flex min-w-0 max-w-128 flex-wrap items-start gap-3 rounded-lg border border-border bg-muted p-3') }}>
@if (is_array($picture) && $imagePlacement === 'beside')
        <div class="{{ $frame }}" @if ($ratio !== null) style="--sf-picture-ratio: {{ $ratio }}" @endif><x-storyfeed::media :image="$picture" :renderer="$mediaRenderer" :class="$frameMedia" /></div>
@endif
    <div class="sf-media-object__body flex min-w-0 flex-[1_1_--spacing(48)] flex-col gap-1 [overflow-wrap:anywhere]">
@if ($subject)
            <p class="sf-media-object__subject m-0 text-sm font-semibold text-foreground">
@if ($subject['href'])<a href="{{ $subject['href'] }}" {{ (new \Illuminate\View\ComponentAttributeBag($subject['attributes']))->class('text-foreground underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-ring') }}>{{ $subject['label'] }}</a>
@else{{ $subject['label'] }}
@endif
            </p>
@endif

@if (filled($body['content'] ?? null))
            <p class="sf-prose m-0 text-sm leading-[1.6] whitespace-pre-wrap sf-media-object__content line-clamp-3 text-muted-foreground">{{ $body['content'] }}</p>
@endif

@if (is_array($picture) && $imagePlacement === 'below')
            <x-storyfeed::media :image="$picture" :renderer="$mediaRenderer" />
        @endif
@if ($files->isNotEmpty())
        <ul class="sf-media-object__attachments mt-0.5 mb-0 flex list-none flex-col gap-0.5 p-0">
@foreach ($files as $file)
            <li class="sf-file m-0 text-sm text-muted-foreground"><a class="font-medium text-foreground underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-ring" href="{{ $file['href'] }}">{{ $file['name'] ?? $file['href'] }}</a>
@if (filled($file['mediaType'] ?? null)) · {{ $file['mediaType'] }}
@endif</li>
@endforeach
        </ul>
@endif

@if ($footnote)
            <p class="sf-media-object__footnote mt-0.5 mb-0 text-xs leading-[1.6] text-muted-foreground">
@if ($footnote['href'])<a href="{{ $footnote['href'] }}" {{ (new \Illuminate\View\ComponentAttributeBag($footnote['attributes']))->class('font-medium text-foreground underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-ring') }}>{{ $footnote['label'] }}</a>
@else{{ $footnote['label'] }}
@endif
            </p>
@endif
    </div>
</div>
@elseif ($footnote)
<p {{ $attributes->class('sf-media-object__footnote mt-0.5 mb-0 text-xs leading-[1.6] text-muted-foreground') }}>
@if ($footnote['href'])<a href="{{ $footnote['href'] }}" {{ (new \Illuminate\View\ComponentAttributeBag($footnote['attributes']))->class('font-medium text-foreground underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-ring') }}>{{ $footnote['label'] }}</a>
@else{{ $footnote['label'] }}
@endif
</p>
@endif
