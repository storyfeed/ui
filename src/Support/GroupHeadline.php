<?php

namespace Storyfeed\Ui\Support;

use Closure;
use Illuminate\Support\Collection;
use Storyfeed\Support\Entity;
use Storyfeed\Support\FeedItem;
use Storyfeed\Support\Headline;

/** Group singular tokens belong to core's explicit pinned slots. */
final class GroupHeadline
{
    private function __construct(private FeedItem $group) {}

    public static function of(FeedItem $group): self
    {
        return new self($group);
    }

    public function template(): ?string
    {
        return $this->group->headline()->template();
    }

    public function isFallback(): bool
    {
        return $this->group->headline()->isFallback();
    }

    /** @return Collection<int, array<string, mixed>> */
    public function segments(): Collection
    {
        $template = $this->template();
        if ($template === null) {
            return $this->group->headline()->segments();
        }

        $parts = preg_split('/(:[a-z_]+)/', $template, flags: PREG_SPLIT_DELIM_CAPTURE | PREG_SPLIT_NO_EMPTY) ?: [];

        return collect($parts)->flatMap(function (string $part): array {
            if (preg_match('/^:(actor|object|target|context|instrument|origin|result|location|generator)$/', $part, $match) !== 1) {
                return (new Headline($this->group, $part, null))->segments()->all();
            }

            $pinned = $this->group->entity($match[1]);

            return [['type' => 'entity', 'role' => $match[1], 'entity' => $pinned, 'text' => $pinned?->toString() ?? Entity::placeholder($match[1])]];
        })->values();
    }

    /** @param (Closure(Entity): string)|null $entity */
    public function toHtml(?Closure $entity = null): string
    {
        $template = $this->template();
        if ($template === null) {
            return $this->group->headline()->toHtml($entity);
        }

        $draw = $entity ?? fn (Entity $entity): string => $entity->toHtml();
        $parts = preg_split('/(:[a-z_]+)/', $template, flags: PREG_SPLIT_DELIM_CAPTURE | PREG_SPLIT_NO_EMPTY) ?: [];

        return collect($parts)->map(function (string $part) use ($draw): string {
            if (preg_match('/^:(actor|object|target|context|instrument|origin|result|location|generator)$/', $part, $match) !== 1) {
                return (new Headline($this->group, $part, null))->toHtml($draw);
            }

            $pinned = $this->group->entity($match[1]);
            if ($pinned !== null) {
                return $draw($pinned);
            }

            $fallback = $match[1] === 'actor' ? 'Someone' : 'something';
            $translated = __($fallback);
            $label = is_string($translated) ? $translated : $fallback;

            return '<span class="sf-entity sf-entity--unknown font-medium text-foreground italic">'.e($label).'</span>';
        })->implode('');
    }
}
