{{--
    Storyfeed/Body/Change: before and after, per field. A missing side did not
    exist (the field was added or removed); a null side is empty, and says so.
--}}
@props(['body', 'entity' => null])

@php
    $rows = collect($body['items'] ?? [])->filter(fn ($pair) => is_array($pair) && $pair !== []);
    $side = fn ($value): string => match (true) {
        $value === null => __('empty'),
        is_bool($value) => $value ? 'true' : 'false',
        default => (string) $value,
    };
@endphp

@if ($rows->isNotEmpty())
    <dl {{ $attributes->class('m-0 flex flex-col gap-0.5 text-sm') }}>
        @foreach ($rows as $field => $pair)
            <div class="flex flex-wrap items-baseline gap-x-3">
                <dt class="text-zinc-600 dark:text-zinc-400">{{ $field }}</dt>
                <dd class="m-0 flex flex-wrap items-baseline gap-x-1.5">
                    @if (array_key_exists(0, $pair))
                        <span class="line-through text-zinc-600 dark:text-zinc-400">{{ $side($pair[0]) }}</span>
                    @endif
                    @if (array_key_exists(0, $pair) && array_key_exists(1, $pair))
                        <span class="text-zinc-500 dark:text-zinc-400" aria-hidden="true">→</span>
                    @endif
                    @if (array_key_exists(1, $pair))
                        <span>{{ $side($pair[1]) }}</span>
                    @endif
                </dd>
            </div>
        @endforeach
    </dl>
@endif
