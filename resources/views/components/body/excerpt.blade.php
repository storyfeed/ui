{{-- Storyfeed/Body/Excerpt: a passage, and where it came from. --}}
@props(['body', 'entity' => null])

@if (filled($body['text'] ?? null))
    <figure {{ $attributes->class('prose prose-sm prose-zinc max-w-lg dark:prose-invert rounded-lg bg-zinc-50 px-4 py-3 dark:bg-white/5 [&>:first-child]:mt-0 [&>:last-child]:mb-0 [&_blockquote]:my-0') }}>
        <blockquote class="whitespace-pre-wrap text-pretty break-words">{{ $body['text'] }}@if ($body['truncated'] ?? false)<span aria-hidden="true">…</span>@endif</blockquote>
        @if (filled($body['from'] ?? null))
            <figcaption>{{ $body['from'] }}</figcaption>
        @endif
    </figure>
@endif
