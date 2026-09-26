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
    <figure {{ $attributes->class('m-0 flex max-w-sm flex-col rounded-lg border border-zinc-200 dark:border-zinc-700 px-3 py-1.5 text-sm leading-normal') }}>
        @if (filled($body['title'] ?? null))
            <figcaption class="border-b border-zinc-200 dark:border-zinc-700 pt-0.5 pb-1 font-semibold text-zinc-900 dark:text-zinc-100">{{ $body['title'] }}</figcaption>
        @endif
        <dl class="m-0 flex flex-col">
            @foreach ($rows as $row)
                @php($value = $row['value'] ?? null)
                <div class="grid grid-cols-[minmax(0,1fr)_minmax(0,auto)] items-baseline gap-x-4 gap-y-1 border-b border-zinc-200 dark:border-zinc-700 py-1 last:border-0">
                    <dt class="min-w-0 [overflow-wrap:anywhere] text-zinc-900 dark:text-zinc-100">{{ $row['key'] }}</dt>
                    @if ($value === null || $value === '')
                        <dd class="m-0 min-w-0 text-right tabular-nums [overflow-wrap:anywhere] text-zinc-600 dark:text-zinc-400"><span class="italic">{{ $row['missing'] }}</span></dd>
                    @else
                        @php($text = is_bool($value) ? ($value ? __('Yes') : __('No')) : $value)
                        @if ($row['verbatim'] ?? false)
                            {{-- Compared, not read: one line, with the whole value on hover. --}}
                            <dd class="m-0 min-w-0 text-right tabular-nums [overflow-wrap:anywhere] text-zinc-600 dark:text-zinc-400 truncate font-mono text-xs" title="{{ $text }}">{{ $text }}</dd>
                        @else
                            <dd class="m-0 min-w-0 text-right tabular-nums [overflow-wrap:anywhere] text-zinc-600 dark:text-zinc-400">{{ $text }}</dd>
                        @endif
                    @endif
                </div>
            @endforeach
        </dl>
    </figure>
@endif
