{{--
    One body, drawn by its type.

    Core's types map to this kit's components by their short name:
    `Storyfeed/Body/KeyValue` draws `body/key-value`. Any other type maps
    segment by segment, so an app draws its own `Acme/Attachment` by creating
    resources/views/vendor/storyfeed/components/body/acme/attachment.blade.php.
    A type with no component draws its `$fallback` line, escaped and muted,
    when the body carries one, and otherwise nothing: an unknown body is
    skipped, never an error.

    `entity` is the entity the body belongs to; a form that names one of its
    image slots, or avoids repeating its label, reads it.
--}}
@props(['body', 'entity' => null, 'renderer' => null, 'mediaRenderer' => null, 'fileLabeller' => null])

@php
    $type = is_array($body) ? ($body['$body'] ?? null) : null;

    // Stored File bodies keep their original token.
    $type = $type === 'Storyfeed/Body/File' ? 'Storyfeed/Body/FileAttachment' : $type;

    $component = is_string($type) && preg_match('#^[A-Za-z0-9_]+(/[A-Za-z0-9_]+)*$#', $type) === 1
        ? 'body.'.collect(explode('/', \Illuminate\Support\Str::after($type, 'Storyfeed/Body/')))
            ->map(fn (string $segment): string => \Illuminate\Support\Str::kebab($segment))
            ->implode('.')
        : null;
    $fallback = is_string($type) && is_string($body['$fallback'] ?? null) && filled($body['$fallback']) ? $body['$fallback'] : null;
    // The body's own maximum height, if it sets one (see `Bodies::frame()`).
    $frame = is_array($body) ? \Storyfeed\Ui\Support\Bodies::frame($body) : ['style' => null, 'capped' => false];
    $attributes = $attributes->class(['sf-body-form mt-2 max-w-176 empty:hidden', 'max-h-(--sf-body-max-h) overflow-y-auto' => $frame['capped']])
        ->merge(array_filter(['style' => $frame['style'], 'tabindex' => $frame['capped'] ? '0' : null], fn ($value) => $value !== null));
@endphp
@if ($component !== null && view()->exists("storyfeed::components.{$component}"))
    @php
        $rendered = $renderer ? $renderer($body, $entity) : null;
        $rendered ??= \Storyfeed\Ui\Support\Bodies::render('storyfeed::'.$component, $body, $entity, $mediaRenderer, $fileLabeller);
    @endphp
@if (trim(preg_replace('/<!--.*?-->/s', '', $rendered)) !== '')
        <div data-storyfeed-body {{ $attributes }}> {!! $rendered !!} </div>
@endif
@elseif ($fallback !== null)
    <div data-storyfeed-body {{ $attributes }}> <p class="sf-body-fallback m-0 text-base text-muted-foreground [overflow-wrap:anywhere]">{{ $fallback }}</p> </div>
@endif
