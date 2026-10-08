{{--
    Storyfeed/Body/KeyValue: labelled rows under an optional title. A row with
    no value is dropped unless the form gave a word for its absence.
--}}
@props(['body', 'entity' => null])

@php
    $body = \Storyfeed\Body\KeyValue::upgrade($body, is_int($body['$v'] ?? null) ? $body['$v'] : 1);
    $rows = collect($body['items'] ?? [])->filter(fn ($row) => is_array($row) && isset($row['key'])
        && (! (($row['value'] ?? null) === null || ($row['value'] ?? null) === '') || ($row['placeholder'] ?? null) !== null));
@endphp
@if ($rows->isNotEmpty())
    <figure {{ $attributes->class('sf-facts @container/facts m-0 flex max-w-lg flex-col rounded-lg border border-border px-3 py-1.5 text-[13.5px] leading-[1.5]') }}>
@if (filled($body['title'] ?? null))
            <figcaption class="border-b border-border pt-[3px] pb-[5px] font-semibold text-foreground">{{ $body['title'] }}</figcaption>
@endif
        <dl class="sf-facts__rows m-0 flex flex-col">
@foreach ($rows as $row)
                @php($value = $row['value'] ?? null)
                <div class="sf-facts__row grid grid-cols-[max-content_minmax(0,1fr)] @max-[28rem]/facts:grid-cols-1 items-baseline gap-x-4 gap-y-1 border-b border-border py-[3px] last:border-b-0">
                    <dt class="sf-facts__label whitespace-nowrap @max-[28rem]/facts:whitespace-normal @max-[28rem]/facts:[overflow-wrap:anywhere] text-foreground">{{ $row['key'] }}</dt>
@if ($value === null || $value === '')
                        <dd class="sf-facts__value m-0 min-w-0 text-right @max-[28rem]/facts:text-left tabular-nums [overflow-wrap:anywhere] text-muted-foreground"><span class="ml-auto @max-[28rem]/facts:ml-0 block w-fit max-w-full text-left italic">{{ $row['placeholder'] }}</span></dd>
@else
                        @php($text = is_bool($value) ? ($value ? __('Yes') : __('No')) : $value)
@if ($row['verbatim'] ?? false)
                            {{-- Compared, not read: one line, with the whole value on hover. --}}
                            <dd class="sf-facts__value m-0 min-w-0 text-right @max-[28rem]/facts:text-left tabular-nums [overflow-wrap:anywhere] text-muted-foreground truncate font-mono text-[12.5px]" title="{{ $text }}">{{ $text }}</dd>
@else
                            <dd class="sf-facts__value m-0 min-w-0 text-right @max-[28rem]/facts:text-left tabular-nums [overflow-wrap:anywhere] text-muted-foreground"><span class="ml-auto @max-[28rem]/facts:ml-0 block w-fit max-w-full text-left">{{ $text }}</span></dd>
@endif
@endif
                </div>
@endforeach
        </dl>
    </figure>
@endif
