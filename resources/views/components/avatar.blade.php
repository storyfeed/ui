@props(['entity', 'size' => 'md'])
@php
    $color = \Storyfeed\Ui\Support\Avatar::color($entity);
    $icon = $entity->isTombstone() ? null : $entity->media()?->get('icon');
@endphp
<span role="img" aria-label="{{ $entity->label() ?? __('Someone') }}" title="{{ $entity->label() ?? __('Someone') }}"
    {{ $attributes->class(['sf-avatar flex shrink-0 items-center justify-center rounded-full font-semibold select-none ring-2 ring-background',
        'sf-avatar--md size-[var(--sf-disc,--spacing(8))] text-xs' => $size === 'md',
        'sf-avatar--sm size-6 text-[length:--spacing(2.5)]' => $size === 'sm',
        'sf-avatar--pair size-full text-[length:--spacing(2.75)]' => $size === 'pair',
        'sf-avatar--badge [--sf-badge:var(--sf-badge-face)] absolute top-[calc(var(--sf-disc)-var(--sf-badge)+--spacing(0.5))] left-[calc(50%+var(--sf-disc)/2-var(--sf-badge))] size-(--sf-badge) text-[length:--spacing(2.25)]' => $size === 'badge',
        'bg-muted text-white' => $entity->isTombstone(), 'text-black' => $color !== null && \Storyfeed\Ui\Support\Avatar::darkText($entity), 'text-white' => $color !== null && ! \Storyfeed\Ui\Support\Avatar::darkText($entity),
    ])->merge(['style' => $color !== null ? 'background-color: '.$color : null]) }}>
@if (is_array($icon) && filled($icon['src'] ?? null))
        <img src="{{ $icon['src'] }}" alt="{{ $icon['alt'] ?? $entity->label() ?? __('Someone') }}" class="sf-avatar__image block size-full rounded-full object-contain" onerror="this.hidden=true;this.nextElementSibling.hidden=false">
        <span hidden>{{ \Storyfeed\Ui\Support\Avatar::initials($entity, in_array($size, ['badge', 'pair'], true)) }}</span>
@else
        {{ \Storyfeed\Ui\Support\Avatar::initials($entity, in_array($size, ['badge', 'pair'], true)) }}
@endif
</span>
