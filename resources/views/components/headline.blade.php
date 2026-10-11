{{--
    A headline, drawn by core's reader: text escaped, each entity through the
    `storyfeed::entity` view so it carries the kit's classes. An anonymous
    actor's "Someone" is an actor like any named one, so it takes the actor's
    weight and colour, with no link; any other empty role stays bare words.
    Core passes either to the closure as an absent entity with no type
    (storyfeed/storyfeed#98); an older core draws the empty role's words itself.
    The page's viewer, when the feed is given one, reads as "You", drawn as
    the actor it is.
--}}
@props(['headline'])
@aware(['viewer' => null])
@php
    // The viewer, when the page names one (ui#75), reads as "You": marked here, worded once the sentence is known.
    $mark = "\u{E000}";
    $html = $headline->toHtml(fn (\Storyfeed\Support\Entity $entity): string => match (true) {
        \Storyfeed\Ui\Support\Viewer::is($viewer, $entity) => $mark,
        method_exists($entity, 'isAbsent') && $entity->isAbsent() && $entity->role() === 'actor' => '<span class="sf-entity sf-entity--anonymous font-medium text-muted-foreground">'.e($entity->toString()).'</span>',
        $entity->type() === null => e($entity->toString()),
        default => trim(view('storyfeed::entity', ['entity' => $entity])->render()),
    });
@endphp
<span {{ $attributes->class('sf-headline leading-[1.6] text-muted-foreground [overflow-wrap:anywhere]') }}>{!! \Storyfeed\Ui\Support\Viewer::speak($html, $mark) !!}</span>
