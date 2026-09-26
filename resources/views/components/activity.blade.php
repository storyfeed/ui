{{--
    An activity row: the glyph on the rail, the headline and its time, then
    what the activity quotes, the object's picture and the object's bodies.

    `dense` is a group member's row: tighter, under its group.
--}}
@props(['activity', 'last' => false, 'dense' => false])

@php
    // Once what the activity is about has been deleted, the verb may have its
    // own reading. It is drawn instead; the ordinary one stays in the payload.
    $headline = $activity->isRedundant()
        ? ($activity->missingHeadline() ?? $activity->headline())
        : $activity->headline();

    $object = $activity->object();
    $bodies = $object?->bodies() ?? collect();

    // A MediaObject body that names an image slot draws that picture itself,
    // so the row does not paint the same one above it.
    $claimed = $bodies->where('$body', 'Storyfeed/Body/MediaObject')->pluck('image')->all();
    $picture = in_array('preview', $claimed, true) || in_array('url', $claimed, true)
        ? null
        : ($object?->media()?->get('preview') ?? $object?->media()?->get('url'));
@endphp

<article {{ $attributes->class('sf-row') }}>
    <div class="sf-rail">
        <div class="sf-rail__disc">
            <x-storyfeed::glyph :glyph="$activity->glyph()" :intent="$activity->intent()" />
        </div>
        @unless ($last)
            <div class="sf-rail__line" aria-hidden="true"></div>
        @endunless
    </div>

    <div @class(['sf-body', 'sf-body--spaced' => ! $last, 'sf-body--dense' => $dense])>
        <div class="sf-head">
            <x-storyfeed::headline :headline="$headline" />
            <x-storyfeed::time :at="$activity->publishedAt()" />
        </div>

        @if ($thread = $activity->thread())
            <x-storyfeed::thread :thread="$thread" :actor="$activity->actor()" />
        @endif

        @if (is_array($picture))
            <x-storyfeed::media :image="$picture" />
        @endif

        @foreach ($bodies as $body)
            <x-storyfeed::body :body="$body" :entity="$object" />
        @endforeach

        {{ $slot }}
    </div>
</article>
