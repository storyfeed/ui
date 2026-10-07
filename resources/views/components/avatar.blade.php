@props(['entity', 'size' => 'md'])
@php
    $color = \Storyfeed\Ui\Support\Avatar::color($entity);
    $icon = $entity->isTombstone() ? null : $entity->media()?->get('icon');
@endphp
<span role="img" aria-label="{{ $entity->label() ?? __('Someone') }}" title="{{ $entity->label() ?? __('Someone') }}"
    {{ $attributes->class(['sf-avatar flex shrink-0 items-center justify-center rounded-full font-semibold select-none ring-2 ring-background',
        'sf-avatar--md size-[var(--sf-disc,2rem)] text-xs' => $size === 'md',
        'sf-avatar--sm size-6 text-[0.625rem]' => $size === 'sm',
        'sf-avatar--badge [--sf-badge:var(--sf-badge-face)] absolute top-[calc(var(--sf-disc)-var(--sf-badge)+0.125rem)] left-[calc(50%+var(--sf-disc)/2-var(--sf-badge))] size-(--sf-badge) text-[0.5625rem]' => $size === 'badge',
        'bg-muted text-white' => $entity->isTombstone(), 'text-white' => $color !== null,
    ])->merge(['style' => $color !== null ? 'background-color: '.$color : null]) }}>
@if (is_array($icon) && filled($icon['src'] ?? null))
        <img src="{{ $icon['src'] }}" alt="{{ $icon['alt'] ?? $entity->label() ?? __('Someone') }}" class="sf-avatar__image block size-full rounded-full object-contain" onerror="this.hidden=true;this.nextElementSibling.hidden=false">
        <span hidden>{{ \Storyfeed\Ui\Support\Avatar::initials($entity, $size === 'badge') }}</span>
@else
        {{ \Storyfeed\Ui\Support\Avatar::initials($entity, $size === 'badge') }}
@endif
</span>
