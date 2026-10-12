@props(['entity', 'size' => 'md'])
@php
    $color = \Storyfeed\Ui\Support\Avatar::color($entity);
    $icon = $entity->isTombstone() ? null : $entity->media()?->get('icon');
@endphp
<span role="img" aria-label="{{ $entity->label() ?? __('Someone') }}" title="{{ $entity->label() ?? __('Someone') }}"
    {{ $attributes->class(['sf-avatar flex shrink-0 items-center justify-center rounded-full font-semibold select-none ring-2 ring-background has-[>img:not([hidden])]:bg-transparent has-[>img:not([hidden])]:border has-[>img:not([hidden])]:border-border',
        'sf-avatar--md size-[var(--sf-disc,--spacing(8))] text-[length:calc(var(--sf-disc,--spacing(8))*3/8)] leading-(--text-xs--line-height)' => $size === 'md',
        'sf-avatar--sm size-6 text-[length:--spacing(2.5)]' => $size === 'sm',
        'sf-avatar--pair size-full text-[length:calc(var(--sf-disc-v)*11/32)] @max-[1.5rem]/pair:text-[length:calc(var(--sf-disc-v)*33/64)]' => $size === 'pair',
        'sf-avatar--tile aspect-square size-full rounded-lg! ring-0! text-[length:--spacing(5)]' => $size === 'tile',
        'sf-avatar--badge [--sf-badge-v:var(--sf-badge-face-v)] [--sf-badge-anchor-v:--spacing(4.5)] absolute top-[calc(var(--sf-disc-v)+--spacing(0.5)-(var(--sf-badge-anchor-v)+var(--sf-badge-v))/2)] left-[calc(50%+var(--sf-disc-v)/2-(var(--sf-badge-anchor-v)+var(--sf-badge-v))/2)] size-(--sf-badge-v) text-[length:calc(var(--sf-badge-v)/2)]' => $size === 'badge',
        'bg-(--sf-avatar-color)' => $color !== null,
        'bg-muted text-white' => $entity->isTombstone(), 'text-black' => $color !== null && \Storyfeed\Ui\Support\Avatar::darkText($entity), 'text-white' => $color !== null && ! \Storyfeed\Ui\Support\Avatar::darkText($entity),
    ])->merge(array_filter(['style' => $color !== null ? '--sf-avatar-color: '.$color : null])) }}>
@if (is_array($icon) && filled($icon['src'] ?? null))
        <img src="{{ $icon['src'] }}" alt="{{ $icon['alt'] ?? $entity->label() ?? __('Someone') }}" class="sf-avatar__image block size-full rounded-full object-contain" onerror="this.hidden=true;this.nextElementSibling.hidden=false">
        <span hidden>{{ \Storyfeed\Ui\Support\Avatar::initials($entity, in_array($size, ['badge', 'pair'], true)) }}</span>
@else
        {{ \Storyfeed\Ui\Support\Avatar::initials($entity, in_array($size, ['badge', 'pair'], true)) }}
@endif
</span>
