{{--
    One entity in a headline: a link carrying the resolver's attributes when
    it has one, and otherwise its label. A deleted model is never a link.
    Its words, "Someone" or "a removed order", are core's.
--}}
@php($link = \Storyfeed\Ui\Support\Links::entity($entity))
@if ($link !== null)
<a {{ (new \Illuminate\View\ComponentAttributeBag($link['attributes']))->merge(['href' => $link['href']])->class('sf-entity font-medium text-foreground underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring') }}>{{ $entity->toString() }}</a>
@else
<span @class(['sf-entity text-foreground font-medium' => ! $entity->isTombstone() && ! $entity->isDegraded(), 'text-muted-foreground font-normal' => $entity->isTombstone() || $entity->isDegraded(), 'italic' => $entity->isDegraded()])>{{ $entity->toString() }}</span>
@endif
