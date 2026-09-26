{{--
    Storyfeed/Body/Prose carries source. Parse only recognised rich encodings
    and sanitise at render time. Verbatim always displays the escaped source.
--}}
@props(['body', 'entity' => null])

@if (filled($body['content'] ?? null))
    {{-- Text sits on a quiet panel, apart from the headline; verbatim output is its own block. --}}
    <figure {{ $attributes->class(['m-0', 'max-w-xl '.'rounded-lg bg-zinc-50 px-4 py-3 dark:bg-white/5 [&>:first-child]:mt-0 [&>:last-child]:mb-0' => ! ($body['verbatim'] ?? false)]) }}>
        @if (filled($body['title'] ?? null))
            <figcaption class="mb-2 text-sm font-medium text-zinc-900 dark:text-zinc-100">{{ $body['title'] }}</figcaption>
        @endif
        @if ($body['verbatim'] ?? false)
            <div class="prose prose-sm prose-zinc max-w-none dark:prose-invert [&_pre]:my-0 [&_pre]:whitespace-pre-wrap [&_pre]:break-words [&_pre]:max-h-96 [&_pre]:overflow-auto"><pre><code>{{ $body['content'] }}</code></pre></div>
        @elseif (in_array($body['mediaType'] ?? null, ['text/markdown', 'text/html'], true))
            <div class="prose prose-sm prose-zinc max-h-96 max-w-none overflow-y-auto dark:prose-invert [&>:first-child]:mt-0 [&>:last-child]:mb-0">{!! \Storyfeed\Ui\Support\RichText::render($body['content'], $body['mediaType']) !!}</div>
        @else
            <div class="prose prose-sm prose-zinc max-h-96 max-w-none overflow-y-auto whitespace-pre-wrap text-pretty break-words dark:prose-invert [&_p]:my-0"><p>{{ $body['content'] }}</p></div>
        @endif
    </figure>
@endif
