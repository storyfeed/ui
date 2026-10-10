@props(['activity', 'last' => false, 'dense' => false, 'rail' => null, 'timezone' => null, 'renderers' => [], 'removed' => null])
@php
    $activity = \Storyfeed\Support\FeedItem::of($activity);
    $removed ??= isset($renderers['removed']) ? $renderers['removed']($activity) : null;
    $headline = $activity->isRedundant() ? ($activity->missingHeadline() ?? $activity->headline()) : $activity->headline();
    $object = $activity->object();
    $forms = \Storyfeed\Ui\Support\Bodies::in($activity->get('data'));
    $bodies = $object?->bodies() ?? collect();
    $bodies = $bodies->merge(\Storyfeed\Ui\Support\Bodies::in($object?->get('data')))->values();
    // A row shows a picture only when a body asks: an Image naming the icon slot
    // draws as the small thumbnail beside the other bodies, unless the app's
    // form renderer draws that body itself.
    $icon = null;
    foreach ($bodies as $index => $body) {
        if (($icon = \Storyfeed\Ui\Support\Bodies::icon($body, $object)) !== null && (! isset($renderers['form']) || $renderers['form']($body, $object) === null)) {
            $bodies = $bodies->forget($index);
            break;
        }
        $icon = null;
    }
@endphp
<article {{ $attributes->class('sf-row relative flex items-start gap-(--sf-gap) [--spacing:calc(var(--sf-font-size,1rem)/4)] [--text-xs:calc(var(--sf-font-size,1rem)*0.75)] [--text-sm:calc(var(--sf-font-size,1rem)*0.875)] [--text-base:var(--sf-font-size,1rem)] [--sf-gutter:--spacing(8)] [--sf-gap:--spacing(3)] [--sf-disc:--spacing(8)] [--sf-badge:--spacing(3.5)] [--sf-badge-face:--spacing(4.5)] text-base leading-[1.6]') }}>
    <x-storyfeed::rail :item="$activity" :rail="$rail" :dense="$dense" :last="$last" :renderers="$renderers" />
    <div @class(['sf-body min-w-0 flex-1', 'sf-body--spaced pb-5' => ! $last, 'sf-body--dense pt-1' => $dense, 'pt-1.5' => ! $dense])>
        <div class="sf-head flex items-baseline gap-3"><x-storyfeed::headline :headline="$headline" /></div>
        <x-storyfeed::meta :item="$activity" :headline="$headline" :timezone="$timezone" :time-renderer="$renderers['time'] ?? null">{{ $time ?? '' }}</x-storyfeed::meta>
@if ($removed)<p class="sf-removed mt-1 text-sm text-muted-foreground">{{ $removed }}</p>
@endif
@if ($icon)<div class="sf-object-media mt-2 flex items-start gap-3"><x-storyfeed::media :image="$icon" :href="\Storyfeed\Ui\Support\Links::entity($activity->object())['href'] ?? null" :link-attributes="\Storyfeed\Ui\Support\Links::entity($activity->object())['attributes'] ?? []" :renderer="$renderers['media'] ?? null" class="mt-0! size-10! shrink-0 rounded-md!" /><div class="min-w-0 flex-1">
@endif
@if (isset($renderers['body'])){!! $renderers['body']($activity) !!}
@endif
        {{ $slot }}
@foreach ($forms as $body)<x-storyfeed::body :body="$body" :renderer="$renderers['form'] ?? null" :media-renderer="$renderers['media'] ?? null" :file-labeller="$renderers['fileLabel'] ?? null" />
@endforeach
@foreach ($bodies as $body)<x-storyfeed::body :body="$body" :entity="$object" :renderer="$renderers['form'] ?? null" :media-renderer="$renderers['media'] ?? null" :file-labeller="$renderers['fileLabel'] ?? null" />
@endforeach
@if ($icon)</div></div>
@endif
@if (isset($renderers['annotations'])){!! $renderers['annotations']($activity) !!}
@endif
        {{ $annotations ?? '' }}
    </div>
</article>
