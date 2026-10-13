@props(['body', 'entity' => null])
@php
    $title = is_string($body['title'] ?? null) ? $body['title'] : '';
    $language = is_string($body['language'] ?? null) ? $body['language'] : '';
@endphp
<figure {{ $attributes->class('sf-code-block m-0 min-w-0 max-w-144') }}>
@if ($title !== '')
    <figcaption class="sf-code__title mb-2 text-sm font-semibold text-foreground">{{ $title }}</figcaption>
@endif
    <div class="sf-code__prose prose max-w-none text-[length:var(--text-sm)] [--tw-prose-pre-code:var(--color-foreground)] [--tw-prose-pre-bg:var(--color-muted)]">
        <pre class="sf-code m-0 max-h-[var(--sf-prose-max-h,--spacing(96))] overflow-auto rounded-lg px-4 py-3 font-mono text-[length:1em] leading-[1.55] whitespace-pre" tabindex="0"><code @if ($language !== '') class="language-{{ $language }}" @endif>{{ $body['source'] ?? '' }}</code></pre>
    </div>
</figure>
