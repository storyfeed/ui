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
    <figure {{ $attributes->class('sf-facts m-0 flex max-w-lg flex-col rounded-lg border border-border px-3 py-1.5 text-[13.5px] leading-[1.5]') }}>
@if (filled($body['title'] ?? null))
            <figcaption class="border-b border-border pt-[3px] pb-[5px] font-semibold text-foreground">{{ $body['title'] }}</figcaption>
@endif
        <dl class="m-0 flex flex-col">
@foreach ($rows as $row)
                @php($value = $row['value'] ?? null)
                <div class="grid grid-cols-[minmax(0,1fr)_minmax(0,auto)] items-baseline gap-x-4 gap-y-1 border-b border-border py-[3px] last:border-b-0">
                    <dt class="min-w-0 [overflow-wrap:anywhere] text-foreground">{{ $row['key'] }}</dt>
@if ($value === null || $value === '')
                        <dd class="m-0 min-w-0 text-right tabular-nums [overflow-wrap:anywhere] text-muted-foreground"><span class="italic">{{ $row['placeholder'] }}</span></dd>
@else
                        @php($text = is_bool($value) ? ($value ? __('Yes') : __('No')) : $value)
@if ($row['verbatim'] ?? false)
                            {{-- Compared, not read: one line, with the whole value on hover. --}}
                            <dd class="m-0 min-w-0 text-right tabular-nums [overflow-wrap:anywhere] text-muted-foreground truncate font-mono text-[12.5px]" title="{{ $text }}">{{ $text }}</dd>
@else
                            <dd class="m-0 min-w-0 text-right tabular-nums [overflow-wrap:anywhere] text-muted-foreground">{{ $text }}</dd>
@endif
@endif
                </div>
@endforeach
        </dl>
    </figure>
@endif
