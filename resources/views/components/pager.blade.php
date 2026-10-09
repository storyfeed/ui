{{--
    The link to older activity: the same URL with the next cursor. On the
    last page the cursor is null and there is no link.
--}}
@props(['cursor', 'name' => 'cursor'])
@if ($cursor)
    <nav {{ $attributes->class('sf-row relative flex items-start gap-[var(--sf-gap,--spacing(3))]') }} aria-label="{{ __('Pagination Navigation') }}">
        <div class="sf-rail flex w-[var(--sf-gutter,--spacing(8))] shrink-0 flex-col items-center self-stretch">
            <div class="mt-1 w-px flex-1 bg-border" aria-hidden="true"></div>
        </div>
        <a href="{{ request()->fullUrlWithQuery([$name => $cursor]) }}" rel="next" class="inline-block rounded-md border border-border px-3 py-1.5 text-sm font-medium text-muted-foreground no-underline hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">{{ __('Older activity') }}</a>
    </nav>
@endif
