{{--
    A headline, drawn by core's reader: text escaped, each entity through the
    `storyfeed::entity` view so it carries the kit's classes. An anonymous
    actor's "Someone" is an actor like any named one, so it takes the actor's
    weight and colour, with no link; any other empty role stays bare words.
    Core passes either to the closure as an absent entity with no type.
--}}
@props(['headline'])

<span {{ $attributes->class('sf-headline leading-[1.6] text-muted-foreground [overflow-wrap:anywhere]') }}>{!! $headline->toHtml(fn (\Storyfeed\Support\Entity $entity): string => match (true) {
    $entity->isAbsent() && $entity->role() === 'actor' => '<span class="sf-entity sf-entity--anonymous font-medium text-muted-foreground">'.e($entity->toString()).'</span>',
    $entity->type() === null => e($entity->toString()),
    default => trim(view('storyfeed::entity', ['entity' => $entity])->render()),
}) !!}</span>
