{{--
    Storyfeed/Body/Prose: authored text, carried as its source. This kit
    parses no markup and shows the source as text, which is the safe default;
    publish this view to render the media types you trust. Verbatim text is
    set in a fixed width.
--}}
@props(['body', 'entity' => null])

@if (filled($body['content'] ?? null))
    <figure {{ $attributes->class('sf-prose-block') }}>
        @if (filled($body['title'] ?? null))
            <figcaption class="sf-prose__title">{{ $body['title'] }}</figcaption>
        @endif
        @if ($body['verbatim'] ?? false)
            <pre class="sf-verbatim"><code>{{ $body['content'] }}</code></pre>
        @else
            <p class="sf-prose">{{ $body['content'] }}</p>
        @endif
    </figure>
@endif
