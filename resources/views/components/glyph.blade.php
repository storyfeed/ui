{{--
    The rail's disc: the verb's glyph, or a dashed ring when it has none.

    The payload's glyph is a TOKEN, such as `shopping-bag`, and this kit ships
    no icon set. A token draws the view `storyfeed::icons.{token}`, so an app
    adds an icon by creating resources/views/vendor/storyfeed/icons/{token}.blade.php;
    a token with no view draws `icons/activity`.

    `intent` is your app's own word, such as `success`, carried onto
    `data-sf-intent` and never interpreted. Publish this view to map your intent values to Tailwind utilities.
--}}
@props(['glyph' => null, 'intent' => null])

@php
    $icon = is_string($glyph) && preg_match('/^[A-Za-z0-9_-]+$/', $glyph) === 1 && view()->exists("storyfeed::icons.{$glyph}")
        ? "storyfeed::icons.{$glyph}"
        : 'storyfeed::icons.activity';
@endphp

@if ($glyph === null)
    <span {{ $attributes->class('flex size-8 shrink-0 items-center justify-center rounded-full border border-zinc-200 dark:border-zinc-700 bg-white text-zinc-600 dark:text-zinc-400 dark:bg-zinc-900 [&>svg]:size-3.5 border-dashed') }} aria-hidden="true"></span>
@else
    <span {{ $attributes->class('flex size-8 shrink-0 items-center justify-center rounded-full border border-zinc-200 dark:border-zinc-700 bg-white text-zinc-600 dark:text-zinc-400 dark:bg-zinc-900 [&>svg]:size-3.5')->merge(['data-sf-intent' => $intent, 'data-sf-glyph' => $glyph]) }} aria-hidden="true">@include($icon)</span>
@endif
