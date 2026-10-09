@props(['body', 'entity' => null])
@php
    // From v2 core writes `truncated` only when false, so an absent flag is true.
    $truncated = array_key_exists('truncated', $body) ? (bool) $body['truncated'] : (is_int($body['$v'] ?? null) ? $body['$v'] : 1) >= 2;
@endphp
@if (filled($body['text'] ?? null))
    <figure {{ $attributes->class('sf-excerpt-block m-0') }}>
        <blockquote class="sf-excerpt m-0 border-l-2 border-border pl-3 text-base whitespace-pre-wrap text-muted-foreground italic">{!! e($body['text']).($truncated ? '<span aria-hidden="true">…</span>' : '') !!}</blockquote>
@if (filled($body['from'] ?? null))<figcaption class="sf-excerpt__from mt-0.5 text-sm text-muted-foreground">{{ $body['from'] }}</figcaption>
@endif
    </figure>
@endif
