@props(['label', 'dividerStyle' => 'branch'])
<div {{ $attributes->class(['sf-row sf-divider relative flex items-start gap-[var(--sf-gap,--spacing(3))] [&_.sf-rail>div:last-child]:mt-1.25', 'sf-divider--dot' => $dividerStyle === 'dot', 'sf-divider--branch [&_.sf-rail]:relative [&_.sf-rail>div:last-child]:mt-5.5' => $dividerStyle !== 'dot']) }}>
    <div class="sf-rail flex w-[var(--sf-gutter,--spacing(8))] shrink-0 flex-col items-center self-stretch">
@if ($dividerStyle !== 'dot')
            <svg aria-hidden="true" class="sf-rail__branch absolute top-0.75 left-[calc(50%-var(--spacing)*0.1875)] h-5.5 w-4 overflow-visible fill-none stroke-muted-foreground stroke-[1.5] [stroke-linecap:round]" width="16" height="22" viewBox="0 0 16 22"><path d="M0.75 22 V14 Q0.75 6 8.75 6 H15" /></svg>
@else
            <div aria-hidden="true" class="sf-rail__node mt-1.25 size-2.25 shrink-0 rounded-full bg-muted-foreground ring-3 ring-background"></div>
@endif
        <div aria-hidden="true" class="sf-rail__line mt-1 w-px flex-1 bg-border"></div>
    </div>
    <h2 class="sf-day m-0 border-0 pt-0 pb-5 text-xs leading-[1.6] font-semibold tracking-[0.05em] text-muted-foreground uppercase">{{ $label }}</h2>
</div>
