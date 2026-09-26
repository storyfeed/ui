{{--
    One item of a page, drawn by its kind. A kind this kit does not know
    draws nothing, as an unknown body type does.
--}}
@props(['item', 'last' => false])

@if ($item->isDigest())
    <x-storyfeed::digest :digest="$item" :last="$last" {{ $attributes }} />
@elseif ($item->isGroup())
    <x-storyfeed::group :group="$item" :last="$last" {{ $attributes }} />
@elseif ($item->isActivity())
    <x-storyfeed::activity :activity="$item" :last="$last" {{ $attributes }} />
@endif
