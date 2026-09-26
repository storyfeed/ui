{{--
    The link to older activity: the same URL with the next cursor. On the
    last page the cursor is null and there is no link.
--}}
@props(['cursor', 'name' => 'cursor'])

@if ($cursor)
    <nav {{ $attributes->class('sf-row') }} aria-label="{{ __('Pagination Navigation') }}">
        <div class="sf-rail">
            <div class="sf-rail__line" aria-hidden="true"></div>
        </div>
        <a href="{{ request()->fullUrlWithQuery([$name => $cursor]) }}" rel="next" class="sf-more">{{ __('Older activity') }}</a>
    </nav>
@endif
