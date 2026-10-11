{{--
    A headline, drawn by core's reader: text escaped, each entity through the
    `storyfeed::entity` view so it carries the kit's classes. An empty role
    (an anonymous actor's "Someone") stays bare words, as Vue and React draw
    it; core passes it to the closure as an entity with no type.
--}}
@props(['headline'])

<span {{ $attributes->class('sf-headline leading-[1.6] text-muted-foreground [overflow-wrap:anywhere]') }}>{!! $headline->toHtml(fn (\Storyfeed\Support\Entity $entity): string => $entity->type() === null ? e($entity->toString()) : trim(view('storyfeed::entity', ['entity' => $entity])->render())) !!}</span>
