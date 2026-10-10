{{--
    The rail's disc: the verb's glyph, or a dashed ring when it has none.

    The payload's glyph is a TOKEN, such as `shopping-bag`, and this kit ships
    no icon set. A token draws the view `storyfeed::icons.{token}`, so an app
    adds an icon by creating resources/views/vendor/storyfeed/icons/{token}.blade.php;
    a token with no view draws `icons/activity`.

    `intent` is your app's own word, such as `success`, carried onto
    `data-sf-intent` and never interpreted. Publish this view to map your intent values to Tailwind utilities.
--}}
@props(['glyph' => null, 'intent' => null, 'variant' => 'disc', 'renderer' => null])
@php
    $icon = is_string($glyph) && preg_match('/^[A-Za-z0-9_-]+$/', $glyph) === 1 && view()->exists("storyfeed::icons.{$glyph}")
        ? "storyfeed::icons.{$glyph}" : 'storyfeed::icons.activity';
@endphp
<span {{ $attributes->class([
    'sf-icon-slot',
    'sf-icon flex size-[var(--sf-disc,--spacing(8))] shrink-0 items-center justify-center rounded-full border border-border bg-background text-muted-foreground [&_svg]:size-3.5' => $variant !== 'badge',
    'sf-badge absolute z-30 top-[calc(var(--sf-disc)-var(--sf-badge)+--spacing(0.5))] left-[calc(50%+var(--sf-disc)/2-var(--sf-badge))] flex size-(--sf-badge) items-center justify-center rounded-full bg-background text-muted-foreground ring-[length:--spacing(0.375)] ring-background [&_svg]:size-2.5' => $variant === 'badge',
    'sf-icon--blank border-dashed' => $glyph === null,
])->merge(['data-sf-intent' => $variant === 'disc' ? $intent : null, 'data-sf-glyph' => $glyph]) }} aria-hidden="true">
@if ($glyph !== null)
@if ($renderer){!! $renderer($glyph, $variant) !!}
@else
@include($icon)
@endif
@endif</span>
