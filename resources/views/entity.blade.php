{{--
    One entity in a headline: a link carrying the resolver's attributes when
    it has a `url`, and otherwise its label. A deleted model is never a link.
    Its words, "Someone" or "a removed order", are core's.
--}}
@if ($entity->url() !== null && ! $entity->isTombstone())
<a {{ (new \Illuminate\View\ComponentAttributeBag($entity->attributes()))->merge(['href' => $entity->url()])->class('sf-entity font-medium text-foreground underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring') }}>{{ $entity->toString() }}</a>
@else
<span @class(['sf-entity text-foreground font-medium' => ! $entity->isTombstone() && ! $entity->isDegraded(), 'text-muted-foreground font-normal' => $entity->isTombstone() || $entity->isDegraded(), 'italic' => $entity->isDegraded()])>{{ $entity->toString() }}</span>
@endif
