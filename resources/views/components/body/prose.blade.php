{{--
    Storyfeed/Body/Prose: authored text, carried as its source. This kit
    parses no markup and shows the source as text, which is the safe default;
    publish this view to render the media types you trust. Verbatim text is
    set in a fixed width.
--}}
@props(['body', 'entity' => null])

@if (filled($body['content'] ?? null))
    <figure {{ $attributes->class('m-0') }}>
        @if (filled($body['title'] ?? null))
            <figcaption class="mb-1 font-mono text-xs text-zinc-600 dark:text-zinc-400">{{ $body['title'] }}</figcaption>
        @endif
        @if ($body['verbatim'] ?? false)
            <pre class="m-0 max-w-lg overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-700 px-3 py-2 font-mono text-xs leading-relaxed [&>code]:font-[inherit]"><code>{{ $body['content'] }}</code></pre>
        @else
            <p class="m-0 text-sm leading-relaxed whitespace-pre-wrap">{{ $body['content'] }}</p>
        @endif
    </figure>
@endif
