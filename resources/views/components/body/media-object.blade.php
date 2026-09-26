{{--
    Storyfeed/Body/MediaObject: a post. A subject line, some prose, one
    picture, its files and a footnote.

    The body stores no image. `image` names one of the entity's media slots,
    minted when the feed is read, so the picture is always the current one.
    The supplied subject titles the card independently of the headline.
--}}
@props(['body', 'entity' => null])

@php
    $link = fn ($value): ?array => match (true) {
        is_string($value) && $value !== '' => ['label' => $value, 'href' => null],
        is_array($value) && filled($value['label'] ?? $value['href'] ?? null) => ['label' => $value['label'] ?? $value['href'], 'href' => $value['href'] ?? null],
        default => null,
    };

    $subject = $link($body['subject'] ?? null);
    $footnote = $link($body['footnote'] ?? null);
    $imageSlot = is_string($body['image'] ?? null) ? $body['image'] : null;
    $picture = $imageSlot !== null ? $entity?->media()?->get($imageSlot) : null;
    $attachments = collect($body['attachments'] ?? [])->filter(fn ($file) => is_array($file) && filled($file['href'] ?? null));
@endphp

<div {{ $attributes->class('mt-1.5 flex min-w-0 max-w-lg items-start gap-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white/60 p-3 backdrop-blur-sm dark:bg-white/5') }}>
    @if (is_array($picture))
        <div class="w-16 shrink-0 [&>div]:m-0 [&>div]:size-16 [&>div]:rounded-md"><x-storyfeed::media :image="$picture" /></div>
    @endif
    <div class="flex min-w-0 flex-1 flex-col gap-1 [overflow-wrap:anywhere]">
        @if ($subject)
            <p class="m-0 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                @if ($subject['href'])<a class="font-medium text-indigo-700 underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 dark:text-indigo-300" href="{{ $subject['href'] }}">{{ $subject['label'] }}</a>@else{{ $subject['label'] }}@endif
            </p>
        @endif

        @if (filled($body['content'] ?? null))
            <p class="m-0 text-sm leading-relaxed whitespace-pre-wrap line-clamp-3 text-zinc-600 dark:text-zinc-400">{{ $body['content'] }}</p>
        @endif

        @if ($attachments->isNotEmpty())
        <ul class="mt-0.5 flex list-none flex-col gap-0.5 p-0">
        @foreach ($attachments as $file)
            <li class="m-0 text-sm text-zinc-600 dark:text-zinc-400"><a class="font-medium text-indigo-700 underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 dark:text-indigo-300" href="{{ $file['href'] }}">{{ $file['name'] ?? $file['href'] }}</a>@if (filled($file['mediaType'] ?? null)) · {{ $file['mediaType'] }}@endif</li>
        @endforeach
        </ul>
        @endif

        @if ($footnote)
            <p class="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                @if ($footnote['href'])<a class="font-medium text-indigo-700 underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 dark:text-indigo-300" href="{{ $footnote['href'] }}">{{ $footnote['label'] }}</a>@else{{ $footnote['label'] }}@endif
            </p>
        @endif
    </div>
</div>
