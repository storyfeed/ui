@props(['body', 'entity' => null])
@php
    // Core writes `truncated` only when it differs from the default, which was true in v2 only.
    $truncated = array_key_exists('truncated', $body) ? (bool) $body['truncated'] : ($body['$v'] ?? null) === 2;
@endphp
@if (filled($body['text'] ?? null))
    <figure {{ $attributes->class('sf-excerpt-block m-0') }}>
        <blockquote class="sf-excerpt m-0 border-l-2 border-border pl-3 text-sm whitespace-pre-wrap text-muted-foreground italic">{!! e($body['text']).($truncated ? '<span aria-hidden="true">…</span>' : '') !!}</blockquote>
@if (filled($body['from'] ?? null))<figcaption class="sf-excerpt__from mt-0.5 text-xs text-muted-foreground">{{ $body['from'] }}</figcaption>
@endif
    </figure>
@endif
