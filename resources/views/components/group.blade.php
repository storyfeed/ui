{{--
    A group row: the glyph, the group's headline and time, and its members
    behind a disclosure. `count()` is the true total and `children()` can hold
    fewer, so the rest is stated rather than implied.

    A group with no headline of its own reads as its count and opens on its
    members: there is nothing to summarise them with.
--}}
@props(['group', 'last' => false])

@php
    $headline = $group->headline();
    $children = $group->children();
    $hidden = max(0, $group->count() - $children->count());
@endphp

<article {{ $attributes->class('relative flex items-start gap-3') }}>
    <div class="flex w-8 shrink-0 flex-col items-center self-stretch">
        <div class="relative flex shrink-0">
            <x-storyfeed::glyph :glyph="$group->glyph()" :intent="$group->intent()" />
        </div>
        @unless ($last && $children->isEmpty())
            <div class="mt-1 w-px flex-1 bg-zinc-200 dark:bg-zinc-700" aria-hidden="true"></div>
        @endunless
    </div>

    <div @class(['min-w-0 flex-1 pt-1.5', 'pb-5' => ! $last || $children->isNotEmpty()])>
        <div class="leading-relaxed">
            <x-storyfeed::headline :headline="$headline" />
        </div>
        <x-storyfeed::meta :item="$group" :headline="$headline" />

        {{ $slot }}

        @if ($children->isNotEmpty())
            @if ($headline->isFallback())
                <details class="group/disclosure" open>
            @else
                <details class="group/disclosure">
            @endif
                <summary class="mt-1 inline-block cursor-pointer list-none rounded-sm text-xs font-medium underline-offset-2 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 dark:hover:text-zinc-100 [&::-webkit-details-marker]:hidden">
                    <span class="group-open/disclosure:hidden">{{ __('Show all :count', ['count' => $group->count()]) }}</span>
                    <span class="hidden group-open/disclosure:inline">{{ __('Show less') }}</span>
                </summary>

                <div class="mt-3">
                    @foreach ($children as $child)
                        <x-storyfeed::activity :activity="$child" dense :last="$loop->last && $hidden === 0" />
                    @endforeach

                    @if ($hidden > 0)
                        <p class="pl-11 text-xs text-zinc-500 dark:text-zinc-400">{{ __('…and :count more not shown', ['count' => $hidden]) }}</p>
                    @endif
                </div>
            </details>
        @endif
    </div>
</article>
