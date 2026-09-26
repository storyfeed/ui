{{--
    The link to older activity: the same URL with the next cursor. On the
    last page the cursor is null and there is no link.
--}}
@props(['cursor', 'name' => 'cursor'])

@if ($cursor)
    <nav {{ $attributes->class('relative flex items-start gap-3') }} aria-label="{{ __('Pagination Navigation') }}">
        <div class="flex w-8 shrink-0 flex-col items-center self-stretch">
            <div class="mt-1 w-px flex-1 bg-zinc-200 dark:bg-zinc-700" aria-hidden="true"></div>
        </div>
        <a href="{{ request()->fullUrlWithQuery([$name => $cursor]) }}" rel="next" class="inline-block rounded-md border border-zinc-200 dark:border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-400 no-underline hover:bg-zinc-50 hover:text-zinc-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 dark:hover:bg-zinc-800 dark:hover:text-zinc-100">{{ __('Older activity') }}</a>
    </nav>
@endif
