@props(['item', 'last' => false, 'rail' => null, 'childRail' => null, 'interactive' => true, 'collapsed' => null, 'mediaObjects' => true, 'timezone' => null, 'renderers' => []])
@php($item = \Storyfeed\Support\FeedItem::of($item))
@if ($item->isGroup())
    <x-storyfeed::group :group="$item" :last="$last" :rail="$rail" :child-rail="$childRail" :interactive="$interactive" :collapsed="$collapsed" :media-objects="$mediaObjects" :timezone="$timezone" :renderers="$renderers" {{ $attributes }}>{{ $slot }}</x-storyfeed::group>
@elseif ($item->isActivity())
    <x-storyfeed::activity :activity="$item" :last="$last" :media-objects="$mediaObjects" :rail="$rail" :timezone="$timezone" :renderers="$renderers" {{ $attributes }}>{{ $slot }}</x-storyfeed::activity>
@endif
