{{--
    A digest row: one person's day across verbs, or a crowd who all did the
    same one thing. Its headline names the person once and joins the per-verb
    phrases; core's reader writes that sentence, so the row is a group row
    with a class of its own to style it by.

    To lay the phrases out yourself, `$digest->phrases()` reads each one as a
    feed item with its own `headline()` and `count()`.
--}}
@props(['digest', 'last' => false])

<x-storyfeed::group :group="$digest" :last="$last" {{ $attributes->class('sf-digest') }}>
    {{ $slot }}
</x-storyfeed::group>
