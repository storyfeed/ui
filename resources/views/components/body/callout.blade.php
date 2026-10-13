@props(['body', 'entity' => null])
@php
    $title = is_string($body['title'] ?? null) ? $body['title'] : '';
    $intent = in_array($body['intent'] ?? null, ['info', 'success', 'warning', 'danger'], true) ? $body['intent'] : 'note';
@endphp
<aside data-sf-intent="{{ $intent }}" {{ $attributes->class('sf-callout min-w-0 max-w-128 rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm leading-[1.6] text-foreground [overflow-wrap:anywhere] data-[sf-intent=info]:border-sky-500/25 data-[sf-intent=info]:bg-sky-500/5 data-[sf-intent=info]:text-sky-800 dark:data-[sf-intent=info]:bg-sky-500/10 dark:data-[sf-intent=info]:text-sky-200 data-[sf-intent=success]:border-emerald-500/25 data-[sf-intent=success]:bg-emerald-500/5 data-[sf-intent=success]:text-emerald-800 dark:data-[sf-intent=success]:bg-emerald-500/10 dark:data-[sf-intent=success]:text-emerald-200 data-[sf-intent=warning]:border-amber-500/25 data-[sf-intent=warning]:bg-amber-500/5 data-[sf-intent=warning]:text-amber-800 dark:data-[sf-intent=warning]:bg-amber-500/10 dark:data-[sf-intent=warning]:text-amber-200 data-[sf-intent=danger]:border-red-500/25 data-[sf-intent=danger]:bg-red-500/5 data-[sf-intent=danger]:text-red-800 dark:data-[sf-intent=danger]:bg-red-500/10 dark:data-[sf-intent=danger]:text-red-200') }}>
@if ($title !== '')
    <p class="sf-callout__title m-0 mb-1 font-semibold">{{ $title }}</p>
@endif
    <p class="sf-callout__content m-0 whitespace-pre-wrap">{{ $body['content'] ?? '' }}</p>
</aside>
