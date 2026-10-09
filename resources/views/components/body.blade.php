{{--
    One body, drawn by its type.

    Core's types map to this kit's components by their short name:
    `Storyfeed/Body/KeyValue` draws `body/key-value`. Any other type maps
    segment by segment, so an app draws its own `Acme/Attachment` by creating
    resources/views/vendor/storyfeed/components/body/acme/attachment.blade.php.
    A type with no component draws nothing: an unknown body is skipped, never
    an error.

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
@endphp
@if ($component !== null && view()->exists("storyfeed::components.{$component}"))
    @php
        $rendered = $renderer ? $renderer($body, $entity) : null;
        $rendered ??= \Storyfeed\Ui\Support\Bodies::render('storyfeed::'.$component, $body, $entity, $mediaRenderer, $fileLabeller);
    @endphp
@if (trim(preg_replace('/<!--.*?-->/s', '', $rendered)) !== '')
        <div data-storyfeed-body {{ $attributes->class('sf-body-form mt-2 max-w-176 empty:hidden') }}> {!! $rendered !!} </div>
@endif
@endif
