{{--
    Storyfeed/Body/KeyValue: labelled rows under an optional title. A row with
    no value is dropped unless the form gave a word for its absence.
--}}
@props(['body', 'entity' => null])

@php
    $rows = collect($body['items'] ?? [])->filter(fn ($row) => is_array($row) && isset($row['key'])
        && (! (($row['value'] ?? null) === null || ($row['value'] ?? null) === '') || ($row['missing'] ?? null) !== null));
@endphp

@if ($rows->isNotEmpty())
    <figure {{ $attributes->class('sf-facts') }}>
        @if (filled($body['title'] ?? null))
            <figcaption class="sf-facts__title">{{ $body['title'] }}</figcaption>
        @endif
        <dl class="sf-facts__rows">
            @foreach ($rows as $row)
                @php($value = $row['value'] ?? null)
                <div class="sf-facts__row">
                    <dt class="sf-facts__label">{{ $row['key'] }}</dt>
                    @if ($value === null || $value === '')
                        <dd class="sf-facts__value"><span class="sf-facts__value--absent">{{ $row['missing'] }}</span></dd>
                    @else
                        @php($text = is_bool($value) ? ($value ? __('Yes') : __('No')) : $value)
                        @if ($row['verbatim'] ?? false)
                            {{-- Compared, not read: one line, with the whole value on hover. --}}
                            <dd class="sf-facts__value sf-facts__value--verbatim" title="{{ $text }}">{{ $text }}</dd>
                        @else
                            <dd class="sf-facts__value">{{ $text }}</dd>
                        @endif
                    @endif
                </div>
            @endforeach
        </dl>
    </figure>
@endif
