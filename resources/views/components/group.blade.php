@props(['group', 'last' => false, 'rail' => null, 'interactive' => true, 'collapsed' => null, 'timezone' => null, 'renderers' => [], 'removed' => null, 'objectIcon' => null, 'mediaTiles' => null, 'mediaOverflow' => 0])
@php
    $group = \Storyfeed\Support\FeedItem::of($group);
    $removed ??= isset($renderers['removed']) ? $renderers['removed']($group) : null;
    $objectIcon ??= isset($renderers['objectIcon']) ? $renderers['objectIcon']($group) : null;
    $headline = $group->headline();
    if ($headline->isFallback() && $group->phrases()->isNotEmpty()) {
        // Match Vue's three-phrase reading without changing the input payload.
        $headline = (new \Storyfeed\Support\FeedItem([
            ...$group->toArray(), 'kind' => 'group', 'axis' => 'summary',
            'phrases' => $group->phrases()->take(3)->map(fn ($phrase) => $phrase->toArray())->all(),
            'count' => $group->phrases()->sum(fn ($phrase) => $phrase->count()),
        ]))->headline();
    }
    $children = $group->children();
    $hidden = max(0, $group->count() - $children->count());
    $tiles = $mediaTiles ?? (isset($renderers['mediaTiles']) ? $renderers['mediaTiles']($group) : null);
    $mediaOverflow = isset($renderers['mediaOverflow']) ? $renderers['mediaOverflow']($group) : $mediaOverflow;
    if ($tiles === null) {
    $tiles = [];
    foreach ($group->objects() as $entity) {
        foreach ($entity->bodies()->merge(\Storyfeed\Ui\Support\Bodies::in($entity->get('data'))) as $body) {
            if (($body['$body'] ?? null) === 'Storyfeed/Body/Image') {
                $imageSlot = $body['image'] ?? 'preview';
                $image = in_array($imageSlot, ['icon', 'preview', 'image'], true) ? $entity->media()?->get($imageSlot) : null;
                if (is_array($image) && ! empty($image['src'])) { $image['alt'] = $body['alt'] ?? $body['caption'] ?? ''; $tiles[] = ['image' => $image, 'href' => $entity->url()]; break; }
            }
        }
    }
    }
    $open = ($group->get('expanded') ?? false) || ($collapsed === null ? (! $interactive || ($headline->isFallback() && $group->phrases()->isEmpty())) : ! $collapsed);
@endphp
<article {{ $attributes->class(['sf-row relative flex items-start gap-(--sf-gap) [--sf-gutter:2rem] [--sf-gap:0.75rem] [--sf-disc:2rem] [--sf-badge:0.875rem] [--sf-badge-face:1.125rem]', '[&:not(:has(>.sf-body>.sf-disclosure[open]))>.sf-rail>[aria-hidden]]:hidden' => $last && $interactive]) }}>
    <x-storyfeed::rail :item="$group" :rail="$rail" :last="$last && ! $interactive && ! $open" :renderers="$renderers" />
    <div @class(['sf-body min-w-0 flex-1 pt-1.5 [&:has(>.sf-disclosure[open])>.sf-media-strip]:hidden', 'sf-body--spaced pb-5' => ! $last || (! $interactive && $open), '[&:has(>.sf-disclosure[open])]:pb-5' => $last])>
        <div class="sf-head flex items-baseline gap-3"><x-storyfeed::headline :headline="$headline" /></div>
        <x-storyfeed::meta :item="$group" :headline="$headline" :timezone="$timezone" :time-renderer="$renderers['time'] ?? null">{{ $time ?? '' }}</x-storyfeed::meta>
@if ($removed)<p class="sf-removed mt-1 text-xs text-muted-foreground">{{ $removed }}</p>
@endif
@if ($objectIcon)<div class="sf-object-media mt-2 flex items-start gap-3"><x-storyfeed::media :image="$objectIcon" class="mt-0! size-10! shrink-0 rounded-md!" /><div class="min-w-0 flex-1">
@endif
@if (isset($renderers['body'])){!! $renderers['body']($group) !!}
@endif
        {{ $slot }}
@if ($objectIcon)</div></div>
@endif
@if (isset($renderers['annotations'])){!! $renderers['annotations']($group) !!}
@endif
        {{ $annotations ?? '' }}
        <x-storyfeed::media-strip :tiles="$tiles" :overflow="$mediaOverflow" :class="! $interactive && $open ? 'hidden' : ''" :renderer="$renderers['media'] ?? null" />
        @if ($children->isNotEmpty())
            @if ($interactive)
                <details class="group/disclosure sf-disclosure print:[&::details-content]:block print:[&::details-content]:[content-visibility:visible]" @if ($open) open @endif>
                    <summary class="sf-toggle mt-1 inline-block cursor-pointer list-none rounded-sm border-0 bg-transparent p-0 text-xs leading-[1.6] font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-ring [&::-webkit-details-marker]:hidden print:hidden">
                        <span class="group-open/disclosure:hidden">{{ __('Show all :count', ['count' => $group->count()]) }}</span><span class="hidden group-open/disclosure:inline">{{ __('Show less') }}</span>
                    </summary>
            @endif
            @if ($interactive || $open)
                <div class="sf-children mt-3">
                    @foreach ($children as $child)
                        <x-storyfeed::activity :activity="$child" dense :rail="$rail" :last="$loop->last && $hidden === 0" :timezone="$timezone" :renderers="$renderers" />
                    @endforeach
                    @if ($hidden > 0)
                        <p class="sf-overflow pl-[calc(var(--sf-gutter)+var(--sf-gap))] text-xs leading-[1.6] text-muted-foreground">{{ __('…and :count more not shown', ['count' => $hidden]) }}</p>
                    @endif
                </div>
            @endif
            @if ($interactive)
                </details>
            @endif
        @endif
    </div>
</article>
