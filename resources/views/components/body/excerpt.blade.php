{{-- Storyfeed/Body/Excerpt: a passage, and where it came from. --}}
@props(['body', 'entity' => null])

@if (filled($body['text'] ?? null))
    <figure {{ $attributes->class('sf-excerpt-block') }}>
        <blockquote class="sf-excerpt">{{ $body['text'] }}@if ($body['truncated'] ?? false)<span aria-hidden="true">…</span>@endif</blockquote>
        @if (filled($body['from'] ?? null))
            <figcaption class="sf-excerpt__from">{{ $body['from'] }}</figcaption>
        @endif
    </figure>
@endif
