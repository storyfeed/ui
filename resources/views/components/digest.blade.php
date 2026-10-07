@props(['digest', 'last' => false, 'rail' => null, 'interactive' => true, 'collapsed' => null, 'timezone' => null, 'renderers' => []])
<x-storyfeed::group :group="$digest" :last="$last" :rail="$rail" :interactive="$interactive" :collapsed="$collapsed" :timezone="$timezone" :renderers="$renderers" {{ $attributes->merge(['data-storyfeed-summary' => '']) }}>{{ $slot }}</x-storyfeed::group>
