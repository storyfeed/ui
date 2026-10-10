{{--
    A headline, drawn by core's reader: text escaped, each entity through the
    `storyfeed::entity` view so it carries the kit's classes.
--}}
@props(['headline'])

<span {{ $attributes->class('sf-headline leading-[1.6] text-muted-foreground [overflow-wrap:anywhere]') }}>{!! $headline->toHtml(fn (\Storyfeed\Support\Entity $entity): string => trim(view('storyfeed::entity', ['entity' => $entity])->render())) !!}</span>
