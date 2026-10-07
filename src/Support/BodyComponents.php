<?php

namespace Storyfeed\Ui\Support;

/** Application-controlled allowlist; a stored name never selects a view directly. */
final class BodyComponents
{
    /** @var array<string, string> */
    private array $components = [];

    public function register(string $name, string $component): self
    {
        $this->components[$name] = $component;

        return $this;
    }

    public function resolve(string $name): ?string
    {
        return $this->components[$name] ?? null;
    }
}
