@props(['label', 'dividerStyle' => 'branch'])
<div {{ $attributes->class(['sf-row sf-divider relative flex items-start gap-[var(--sf-gap,--spacing(3))]', 'sf-divider--dot [&_.sf-rail>div:last-child]:mt-1.25' => $dividerStyle === 'dot', 'sf-divider--branch' => $dividerStyle !== 'dot']) }}>
    <div class="sf-rail relative flex w-[var(--sf-gutter,--spacing(8))] shrink-0 flex-col items-center self-stretch">
@if ($dividerStyle === 'dot')
            <div aria-hidden="true" class="sf-rail__node mt-1.25 size-2.25 shrink-0 rounded-full bg-muted-foreground ring-3 ring-background"></div>
        <div aria-hidden="true" class="sf-rail__line mt-1 w-px flex-1 bg-border"></div>
@else
            {{-- The curve shares the rail line's 1px column and colour; the line continues from its end, leaving a gap above it. --}}
            <div aria-hidden="true" class="sf-rail__branch absolute top-[calc(0.5625em-0.5px)] left-[calc(50%-0.5px)] h-2 w-[calc(50%+0.5px+var(--sf-gap,--spacing(3))-var(--spacing)*1.5)] rounded-tl-[calc(var(--spacing)*2)] border-t border-l border-border"></div>
        <div aria-hidden="true" class="sf-rail__line mt-[calc(0.5625em-0.5px+var(--spacing)*2)] w-px flex-1 bg-border"></div>
@endif
    </div>
    <h2 class="sf-day m-0 border-0 pt-0 pb-5 text-xs leading-[1.6] font-semibold tracking-[0.05em] text-muted-foreground uppercase">{{ $label }}</h2>
</div>
