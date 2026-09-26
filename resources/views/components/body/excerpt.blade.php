{{-- Storyfeed/Body/Excerpt: a passage, and where it came from. --}}
@props(['body', 'entity' => null])

@if (filled($body['text'] ?? null))
    <figure {{ $attributes->class('m-0') }}>
        <blockquote class="m-0 border-l-2 border-zinc-200 dark:border-zinc-700 pl-3 text-sm whitespace-pre-wrap italic text-zinc-600 dark:text-zinc-400">{{ $body['text'] }}@if ($body['truncated'] ?? false)<span aria-hidden="true">…</span>@endif</blockquote>
        @if (filled($body['from'] ?? null))
            <figcaption class="mt-0.5 text-xs text-zinc-600 dark:text-zinc-400">{{ $body['from'] }}</figcaption>
        @endif
    </figure>
@endif
