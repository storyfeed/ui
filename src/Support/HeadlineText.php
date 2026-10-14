<?php

namespace Storyfeed\Ui\Support;

use Closure;
use ReflectionMethod;
use Storyfeed\Support\Entity;
use Storyfeed\Support\Headline;

/**
 * How a headline's text segments are drawn (ui#97): an application-registered
 * `(string $text): string` closure returning HTML, or escaped text when none is
 * registered. Entities, entity lists and the viewer's words never reach it.
 *
 *     app(HeadlineText::class)->register(HeadlineText::inlineCode(...));
 *
 * The closure goes to core's `Headline::toHtml(text: …)`
 * (storyfeed/storyfeed#208); a core without that parameter keeps today's output.
 */
final class HeadlineText
{
    private ?Closure $formatter = null;

    private static ?bool $supported = null;

    /** @param (Closure(string): string)|null $formatter */
    public function register(?Closure $formatter): self
    {
        $this->formatter = $formatter;

        return $this;
    }

    /** @return (Closure(string): string)|null */
    public function formatter(): ?Closure
    {
        return $this->formatter;
    }

    /**
     * A headline as HTML, its text through the registered formatter.
     *
     * @param  (Closure(Entity): string)|null  $entity
     */
    public function render(Headline|GroupHeadline $headline, ?Closure $entity = null): string
    {
        return $headline instanceof GroupHeadline
            ? $headline->toHtml($entity, $this->formatter)
            : self::draw($headline, $entity, $this->formatter);
    }

    /**
     * Core's headline as HTML, passing the text closure only to a core that takes one.
     *
     * @param  (Closure(Entity): string)|null  $entity
     * @param  (Closure(string): string)|null  $text
     */
    public static function draw(Headline $headline, ?Closure $entity = null, ?Closure $text = null): string
    {
        // Core also sends generated fallback words to the closure; this seam is authored text only.
        if ($text === null || ! self::supported() || $headline->isFallback()) {
            return $headline->toHtml($entity);
        }

        // Reflection keeps the call valid against the older core's signature too.
        $html = (new ReflectionMethod($headline, 'toHtml'))->invoke($headline, $entity, $text);

        return is_string($html) ? $html : $headline->toHtml($entity);
    }

    /** Whether core's `Headline::toHtml()` takes a `text` closure. */
    public static function supported(): bool
    {
        if (self::$supported !== null) {
            return self::$supported;
        }

        $parameters = (new ReflectionMethod(Headline::class, 'toHtml'))->getParameters();

        return self::$supported = isset($parameters[1]) && $parameters[1]->getName() === 'text';
    }

    /**
     * The built-in formatter: text escaped, each balanced single-backtick span
     * drawn as inline code. Unmatched or doubled backticks stay literal.
     */
    public static function inlineCode(string $text): string
    {
        $parts = preg_split('/(?<!`)`([^`]+)`(?!`)/', $text, flags: PREG_SPLIT_DELIM_CAPTURE);
        if ($parts === false) {
            return e($text);
        }

        $html = '';
        foreach ($parts as $index => $part) {
            $html .= $index % 2 === 1
                ? trim(view('storyfeed::headline-code', ['code' => $part])->render())
                : e($part);
        }

        return $html;
    }
}
