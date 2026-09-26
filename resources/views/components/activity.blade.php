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

<article {{ $attributes->class('relative flex items-start gap-3') }}>
    <div class="flex w-8 shrink-0 flex-col items-center self-stretch">
        <div class="relative flex shrink-0">
            <x-storyfeed::glyph :glyph="$activity->glyph()" :intent="$activity->intent()" />
        </div>
        @unless ($last)
            <div class="mt-1 w-px flex-1 bg-zinc-200 dark:bg-zinc-700" aria-hidden="true"></div>
        @endunless
    </div>

    <div @class(['min-w-0 flex-1', 'pb-5' => ! $last, 'pt-1' => $dense, 'pt-1.5' => ! $dense])>
        <div class="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
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
