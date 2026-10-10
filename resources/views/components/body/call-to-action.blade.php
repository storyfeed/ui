{{--
    Storyfeed/Body/CallToAction: an optional heading and a sentence or two,
    then one action, drawn as a button. A lone action draws as the button
    alone. Blade draws a plain link; `modal` is for the JavaScript kits.
--}}
@props(['body', 'entity' => null])

@php
    $text = fn (mixed $value): ?string => is_string($value) && trim($value) !== '' ? $value : null;
    $subject = $text($body['subject'] ?? null);
    $content = $text($body['content'] ?? null);
    $label = $text($body['action']['label'] ?? null);
    // A link without an href goes to the body's own entity.
    $link = \Storyfeed\Ui\Support\Links::body($body['action']['link'] ?? null, $entity);
    $href = $link['href'] ?? null;
    $attributes = $attributes->class(($subject || $content) ? 'sf-cta mt-1.5 flex min-w-0 max-w-128 flex-col items-start gap-1 rounded-lg border border-border bg-card p-3 [overflow-wrap:anywhere]' : '');
    $linkAttributes = $link['attributes'] ?? [];
@endphp
@if ($subject || $content)
    <div {{ $attributes }}>
@if ($subject)
        <p class="sf-cta__subject m-0 text-sm font-semibold text-foreground">{{ $subject }}</p>
@endif
@if ($content)
        <p class="sf-cta__content m-0 text-sm leading-[1.6] whitespace-pre-line text-muted-foreground">{{ $content }}</p>
@endif
@if ($label && $href)
        <a href="{{ $href }}" {{ (new \Illuminate\View\ComponentAttributeBag($linkAttributes))->class('sf-cta__action inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground no-underline hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring mt-1.5') }}>{{ $label }}<span aria-hidden="true">→</span></a>
@endif
    </div>
@elseif ($label && $href)
    <a href="{{ $href }}" {{ (new \Illuminate\View\ComponentAttributeBag($linkAttributes))->class('sf-cta__action inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground no-underline hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring') }}>{{ $label }}<span aria-hidden="true">→</span></a>
@endif
