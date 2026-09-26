{{--
    Storyfeed/Body/Prose carries source. Parse only recognised rich encodings
    and sanitise at render time. Verbatim always displays the escaped source.
--}}
@props(['body', 'entity' => null])

@if (filled($body['content'] ?? null))
    <figure {{ $attributes->class('m-0') }}>
        @if (filled($body['title'] ?? null))
            <figcaption class="mb-2 text-xs font-medium text-zinc-900 dark:text-zinc-100">{{ $body['title'] }}</figcaption>
        @endif
        @if ($body['verbatim'] ?? false)
            <div class="prose prose-sm prose-zinc max-w-none dark:prose-invert [&_pre]:my-0 [&_pre]:whitespace-pre-wrap [&_pre]:break-words [&_pre]:max-h-[32rem] [&_pre]:overflow-y-auto"><pre><code>{{ $body['content'] }}</code></pre></div>
        @elseif (in_array($body['mediaType'] ?? null, ['text/markdown', 'text/html'], true))
            <div class="prose prose-sm prose-zinc max-w-none dark:prose-invert">{!! \Storyfeed\Ui\Support\RichText::render($body['content'], $body['mediaType']) !!}</div>
        @else
            <div class="prose prose-sm prose-zinc max-w-none whitespace-pre-wrap text-pretty break-words dark:prose-invert"><p>{{ $body['content'] }}</p></div>
        @endif
    </figure>
@endif
