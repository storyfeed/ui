{{--
    One entity in a headline: a link carrying the resolver's attributes when
    it has a `url`, and otherwise its label. A deleted model is never a link.
    Its words, "Someone" or "a removed order", are core's.
--}}
@if ($entity->url() !== null && ! $entity->isTombstone())
<a {{ (new \Illuminate\View\ComponentAttributeBag($entity->attributes()))->merge(['href' => $entity->url()])->class('sf-entity') }}>{{ $entity->toString() }}</a>
@else
<span @class(['sf-entity', 'sf-entity--tombstone' => $entity->isTombstone(), 'sf-entity--unknown' => $entity->isDegraded()])>{{ $entity->toString() }}</span>
@endif
