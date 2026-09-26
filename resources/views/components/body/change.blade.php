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
    <dl {{ $attributes->class('sf-change') }}>
        @foreach ($rows as $field => $pair)
            <div class="sf-change__row">
                <dt class="sf-change__field">{{ $field }}</dt>
                <dd class="sf-change__pair">
                    @if (array_key_exists(0, $pair))
                        <span class="sf-change__before">{{ $side($pair[0]) }}</span>
                    @endif
                    @if (array_key_exists(0, $pair) && array_key_exists(1, $pair))
                        <span class="sf-change__arrow" aria-hidden="true">→</span>
                    @endif
                    @if (array_key_exists(1, $pair))
                        <span>{{ $side($pair[1]) }}</span>
                    @endif
                </dd>
            </div>
        @endforeach
    </dl>
@endif
