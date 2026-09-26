{{--
    One entity in a headline: a link carrying the resolver's attributes when
    it has a `url`, and otherwise its label. A deleted model is never a link.
    Its words, "Someone" or "a removed order", are core's.
--}}
@if ($entity->url() !== null && ! $entity->isTombstone())
<a {{ (new \Illuminate\View\ComponentAttributeBag($entity->attributes()))->merge(['href' => $entity->url()])->class('font-medium text-indigo-700 underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 dark:text-indigo-300') }}>{{ $entity->toString() }}</a>
@else
<span @class(['text-zinc-900 dark:text-zinc-100 font-medium' => ! $entity->isTombstone() && ! $entity->isDegraded(), 'text-zinc-600 dark:text-zinc-400 font-normal' => $entity->isTombstone() || $entity->isDegraded(), 'italic' => $entity->isDegraded()])>{{ $entity->toString() }}</span>
@endif
