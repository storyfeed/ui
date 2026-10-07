@props(['body', 'entity' => null])
@php
    $registeredComponent = is_string($body['name'] ?? null) ? app(\Storyfeed\Ui\Support\BodyComponents::class)->resolve($body['name']) : null;
    $attributes = new \Illuminate\View\ComponentAttributeBag(is_array($body['props'] ?? null) ? $body['props'] : []);
@endphp
@if ($registeredComponent !== null)
    <x-dynamic-component :component="$registeredComponent" {{ $attributes }} />
@endif
