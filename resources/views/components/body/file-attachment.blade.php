{{--
    Storyfeed/Body/FileAttachment: an attachment name with its size and media type.
    The entity supplies the resolved URL; the body stores no URL.
--}}
@props(['body', 'entity' => null])

@php
    $size = $body['size'] ?? null;

    if (is_int($size)) {
        $units = ['B', 'KB', 'MB', 'GB'];
        $value = $size;
        $unit = 0;

        while ($value >= 1024 && $unit < count($units) - 1) {
            $value /= 1024;
            $unit++;
        }

        $size = ($value >= 10 || $unit === 0 ? round($value) : number_format($value, 1)).' '.$units[$unit];
    }

    $name = $body['name'] ?? $entity?->label();
    $url = $entity?->url();
    $details = collect([
        is_string($size) ? $size : null,
        $body['mediaType'] ?? null,
    ])->filter();
@endphp

@if (filled($name) || $details->isNotEmpty())
    <div {{ $attributes->class('flex max-w-sm items-start gap-3 rounded-lg border border-zinc-200 p-3 dark:border-zinc-700') }}>
        <span class="mt-0.5 shrink-0 text-zinc-500 dark:text-zinc-400" aria-hidden="true">@include('storyfeed::icons.paper-clip')</span>
        <div class="min-w-0 flex-1 [overflow-wrap:anywhere]">
            @if (filled($name))
                <p class="m-0 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    @if ($url)
                        <a {{ (new \Illuminate\View\ComponentAttributeBag($entity->attributes()))->merge(['href' => $url])->class('text-indigo-700 underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 dark:text-indigo-300') }}>{{ $name }}</a>
                    @else
                        {{ $name }}
                    @endif
                </p>
            @endif
            @if ($details->isNotEmpty())
                <p class="m-0 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">{{ $details->implode(' · ') }}</p>
            @endif
        </div>
    </div>
@endif
