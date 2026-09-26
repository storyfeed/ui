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

<article {{ $attributes->class('sf-row') }}>
    <div class="sf-rail">
        <div class="sf-rail__disc">
            <x-storyfeed::glyph :glyph="$group->glyph()" :intent="$group->intent()" />
        </div>
        @unless ($last && $children->isEmpty())
            <div class="sf-rail__line" aria-hidden="true"></div>
        @endunless
    </div>

    <div @class(['sf-body', 'sf-body--spaced' => ! $last || $children->isNotEmpty()])>
        <div class="sf-head">
            <x-storyfeed::headline :headline="$headline" />
            <x-storyfeed::time :at="$group->publishedAt()" />
        </div>

        {{ $slot }}

        @if ($children->isNotEmpty())
            @if ($headline->isFallback())
                <details class="sf-disclosure" open>
            @else
                <details class="sf-disclosure">
            @endif
                <summary class="sf-toggle">
                    <span class="sf-toggle__more">{{ __('Show all :count', ['count' => $group->count()]) }}</span>
                    <span class="sf-toggle__less">{{ __('Show less') }}</span>
                </summary>

                <div class="sf-children">
                    @foreach ($children as $child)
                        <x-storyfeed::activity :activity="$child" dense :last="$loop->last && $hidden === 0" />
                    @endforeach

                    @if ($hidden > 0)
                        <p class="sf-overflow">{{ __('…and :count more not shown', ['count' => $hidden]) }}</p>
                    @endif
                </div>
            </details>
        @endif
    </div>
</article>
