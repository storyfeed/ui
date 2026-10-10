@props(['group', 'last' => false, 'rail' => null, 'childRail' => null, 'interactive' => true, 'collapsed' => null, 'timezone' => null, 'renderers' => [], 'removed' => null, 'mediaTiles' => null, 'mediaOverflow' => 0])
@php
    $group = \Storyfeed\Support\FeedItem::of($group);
    $removed ??= isset($renderers['removed']) ? $renderers['removed']($group) : null;
    $headline = \Storyfeed\Ui\Support\GroupHeadline::of($group);
    $children = $group->children();
    $hidden = max(0, $group->count() - $children->count());
    $tiles = $mediaTiles ?? (isset($renderers['mediaTiles']) ? $renderers['mediaTiles']($group) : null);
    $mediaOverflow = isset($renderers['mediaOverflow']) ? $renderers['mediaOverflow']($group) : $mediaOverflow;
    // One tile per member activity: the picture of what it features, else that entity's avatar (ui#27).
    if ($tiles === null) {
        $strip = \Storyfeed\Ui\Support\Strip::of($group);
        $tiles = $strip['tiles'] ?? [];
        $mediaOverflow = isset($renderers['mediaOverflow']) ? $mediaOverflow : ($strip['overflow'] ?? 0);
    }
    $open = ($group->get('expanded') ?? false) || ($collapsed === null ? (! $interactive || $headline->isFallback()) : ! $collapsed);
    // The "+N" tile opens and closes the members like the toggle does (ui#27).
    // Stable across renders: the group's id, else what it shows.
    $membersId = 'sf-members-'.($group->id() ?? substr(md5((string) json_encode([$group->get('headline'), $group->get('headline_template'), $group->count(), $children->map(fn ($child) => [$child->id(), $child->get('headline')])->all()])), 0, 12));
    $toggle = $interactive && $children->isNotEmpty() ? ['expanded' => $open, 'controls' => $membersId, 'label' => __('Show all :count', ['count' => $group->count()])] : null;
@endphp
<article {{ $attributes->class(['sf-row relative flex items-start gap-(--sf-gap-v) [--spacing:calc(var(--sf-font-size,1rem)/4)] [--text-xs:calc(var(--sf-font-size,1rem)*0.75)] [--text-sm:calc(var(--sf-font-size,1rem)*0.875)] [--text-base:var(--sf-font-size,1rem)] [--sf-gutter-v:var(--sf-gutter,--spacing(8))] [--sf-gap-v:var(--sf-gap,--spacing(3))] [--sf-disc-v:var(--sf-disc,--spacing(8))] [--sf-badge-v:var(--sf-badge,--spacing(3.5))] [--sf-badge-face-v:var(--sf-badge-face,--spacing(4.5))] text-base leading-[1.6]', '[&:not(:has(>.sf-body>.sf-disclosure[open]))>.sf-rail>[aria-hidden]]:hidden' => $last && $interactive]) }}>
    <x-storyfeed::rail :item="$group" :rail="$rail" :last="$last && ! $interactive && ! $open" :renderers="$renderers" />
    <div @class(['sf-body min-w-0 flex-1 pt-1.5', 'sf-body--spaced pb-5' => ! $last || (! $interactive && $open), '[&:has(>.sf-disclosure[open])]:pb-5' => $last])>
        <div class="sf-head flex items-baseline gap-3"><x-storyfeed::headline :headline="$headline" /></div>
        <x-storyfeed::meta :item="$group" :headline="$headline" :timezone="$timezone" :time-renderer="$renderers['time'] ?? null">{{ $time ?? '' }}</x-storyfeed::meta>
@if ($removed)<p class="sf-removed mt-1 text-sm text-muted-foreground">{{ $removed }}</p>
@endif
@if (isset($renderers['body'])){!! $renderers['body']($group) !!}
@endif
        {{ $slot }}
@if (isset($renderers['annotations'])){!! $renderers['annotations']($group) !!}
@endif
        {{ $annotations ?? '' }}
        {{-- Expanding adds, it never takes away: the strip stays in place while members show (ui#26). --}}
        <x-storyfeed::media-strip :tiles="$tiles" :overflow="$mediaOverflow" :renderer="$renderers['media'] ?? null" :toggle="$toggle" />
        @if ($children->isNotEmpty())
            @if ($interactive)
                <details class="group/disclosure sf-disclosure print:[&::details-content]:block print:[&::details-content]:[content-visibility:visible]" @if ($open) open @endif ontoggle="var b=this.closest('.sf-row').querySelector('.sf-media-strip__more[aria-expanded]');if(b)b.setAttribute('aria-expanded',this.open)">
                    <summary class="sf-toggle mt-1 inline-flex min-h-6 items-center cursor-pointer list-none rounded-sm border-0 bg-transparent p-0 text-sm leading-[1.6] font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-ring [&::-webkit-details-marker]:hidden print:hidden">
                        <span class="group-open/disclosure:hidden">{{ __('Show all :count', ['count' => $group->count()]) }}</span><span class="hidden group-open/disclosure:inline">{{ __('Show less') }}</span>
                    </summary>
            @endif
                <div id="{{ $membersId }}" @class(['sf-children mt-3', 'hidden print:block' => ! $interactive && ! $open])>
                    @foreach ($children as $child)
                        <x-storyfeed::activity :activity="$child" dense :rail="$childRail ?? $rail" :last="$loop->last && $hidden === 0" :timezone="$timezone" :renderers="$renderers" />
                    @endforeach
                    @if ($hidden > 0)
                        <p class="sf-overflow pl-[calc(var(--sf-gutter-v)+var(--sf-gap-v))] text-sm leading-[1.6] text-muted-foreground">{{ __('…and :count more not shown', ['count' => $hidden]) }}</p>
                    @endif
                </div>
            @if ($interactive)
                </details>
            @endif
        @endif
    </div>
</article>
