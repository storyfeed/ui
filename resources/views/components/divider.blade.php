@props(['label', 'dividerStyle' => 'dot'])
<div {{ $attributes->class(['sf-row sf-divider relative flex items-start gap-[var(--sf-gap,0.75rem)] [&_.sf-rail>div:last-child]:mt-[0.3125rem]', 'sf-divider--branch [&_.sf-rail]:relative [&_.sf-rail>div:last-child]:mt-[22px]' => $dividerStyle === 'branch', 'sf-divider--dot' => $dividerStyle !== 'branch']) }}>
    <div class="sf-rail flex w-[var(--sf-gutter,2rem)] shrink-0 flex-col items-center self-stretch">
@if ($dividerStyle === 'branch')
            <svg aria-hidden="true" class="sf-rail__branch absolute top-[3px] left-[calc(50%-0.75px)] overflow-visible fill-none stroke-muted-foreground stroke-[1.5] [stroke-linecap:round]" width="16" height="22" viewBox="0 0 16 22"><path d="M0.75 22 V14 Q0.75 6 8.75 6 H15" /></svg>
@else
            <div aria-hidden="true" class="sf-rail__node mt-[0.3125rem] size-[0.5625rem] shrink-0 rounded-full bg-muted-foreground ring-[3px] ring-background"></div>
@endif
        <div aria-hidden="true" class="sf-rail__line mt-1 w-px flex-1 bg-border"></div>
    </div>
    <h2 class="sf-day m-0 border-0 pt-0 pb-5 text-xs leading-[1.6] font-semibold tracking-[0.05em] text-muted-foreground uppercase">{{ $label }}</h2>
</div>
