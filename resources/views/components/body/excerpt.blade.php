@props(['body', 'entity' => null])
@if (filled($body['text'] ?? null))
    <figure {{ $attributes->class('sf-excerpt-block m-0') }}>
        <blockquote class="sf-excerpt m-0 border-l-2 border-border pl-3 text-base whitespace-pre-wrap text-muted-foreground italic">{!! e($body['text']).(($body['truncated'] ?? false) ? '<span aria-hidden="true">…</span>' : '') !!}</blockquote>
@if (filled($body['from'] ?? null))<figcaption class="sf-excerpt__from mt-0.5 text-sm text-muted-foreground">{{ $body['from'] }}</figcaption>
@endif
    </figure>
@endif
