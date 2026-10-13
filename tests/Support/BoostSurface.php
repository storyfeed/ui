<?php

namespace Storyfeed\Ui\Tests\Support;

/**
 * Checks that the Boost guideline and skill only name what this package
 * ships: Blade components and their props, Vue and React exports and props,
 * FEED_* provide keys, PHP support classes, artisan arguments, publish tags
 * and Tailwind source paths. An agent copies these names verbatim, so a
 * renamed prop must fail here rather than in an app.
 */
final class BoostSurface
{
    /** Attributes every element takes; they are never kit props. */
    private const GLOBAL_ATTRIBUTES = ['class', 'className', 'key', 'v-if', 'v-else', 'v-for'];

    /** A tag's attributes, stepping over quoted values and JSX expressions that hold `>`. */
    private const ATTRIBUTES = '((?:"[^"]*"|\\{(?:[^{}]|\\{(?:[^{}]|\\{[^{}]*\\})*\\})*\\}|[^>"{])*)';

    public function __construct(private readonly string $root) {}

    /** @return list<string> */
    public function problems(string $text): array
    {
        // A Windows checkout may carry CRLF line endings.
        $text = str_replace("\r\n", "\n", $text);
        $problems = [];
        foreach ($this->fences($text) as [$language, $code]) {
            $problems = [...$problems, ...$this->imports($language, $code), ...$this->jsTags($language, $code)];
        }

        return array_values(array_unique([
            ...$problems,
            ...$this->bladeComponents($text),
            ...$this->propTable($text),
            ...$this->provideKeys($text),
            ...$this->phpClasses($text),
            ...$this->commands($text),
            ...$this->sources($text),
        ]));
    }

    /** @return list<array{string, string}> */
    private function fences(string $text): array
    {
        preg_match_all('/```(\w*)\n(.*?)```/s', $text, $fenced, PREG_SET_ORDER);
        preg_match_all('/<code-snippet[^>]*lang="(\w+)"[^>]*>(.*?)<\/code-snippet>/s', $text, $snippets, PREG_SET_ORDER);

        return array_map(fn (array $match) => [$match[1], $match[2]], [...$fenced, ...$snippets]);
    }

    /** @return list<string> */
    private function bladeComponents(string $text): array
    {
        $problems = [];
        preg_match_all('/<x-storyfeed::([\w.-]+)'.self::ATTRIBUTES.'>/', $text, $tags, PREG_SET_ORDER);
        foreach ($tags as [, $name, $attributes]) {
            $file = $this->root.'/resources/views/components/'.str_replace('.', '/', $name).'.blade.php';
            if (! is_file($file)) {
                $problems[] = "Blade component <x-storyfeed::{$name}> does not exist";

                continue;
            }
            preg_match('/@props\(\[(.*?)\]\)/s', (string) file_get_contents($file), $props);
            preg_match_all("/'(\w+)'/", $props[1] ?? '', $declared);
            foreach ($this->attributeNames($attributes) as $attribute) {
                if (! in_array($this->camel($attribute), $declared[1], true)) {
                    $problems[] = "<x-storyfeed::{$name}> has no {$attribute} prop";
                }
            }
        }

        return $problems;
    }

    /**
     * The skill's "Feed props" table: the first column names Blade and Vue
     * props, the second React's, so each must be declared by those feeds.
     *
     * @return list<string>
     */
    private function propTable(string $text): array
    {
        if (! preg_match('/^## Feed props\n(.*?)(?=^## |\z)/ms', $text, $section)) {
            return [];
        }

        $blade = (string) file_get_contents($this->root.'/resources/views/components/feed.blade.php');
        $vue = (string) file_get_contents($this->root.'/resources/js/vue/FeedStream.vue');
        $react = file_get_contents($this->root.'/resources/js/react/FeedStream.tsx')
            .file_get_contents($this->root.'/resources/js/react/FeedItem.tsx');
        $declares = fn (string $source, string $prop) => (bool) preg_match('/\b'.$prop.'\??:|\''.$prop.'\'/', $source);

        $problems = [];
        preg_match_all('/^\|([^|\n]*)\|([^|\n]*)\|/m', $section[1], $rows, PREG_SET_ORDER);
        foreach ($rows as [, $bladeAndVue, $reactColumn]) {
            preg_match_all('/`([\w-]+)`/', $bladeAndVue, $names);
            foreach ($names[1] as $name) {
                foreach (['Blade feed' => $blade, 'Vue FeedStream' => $vue] as $kit => $source) {
                    if (! $declares($source, $this->camel($name))) {
                        $problems[] = "{$kit} has no {$name} prop";
                    }
                }
            }
            preg_match_all('/`(\w+)`/', $reactColumn, $names);
            foreach ($names[1] as $name) {
                if (! $declares($react, $name)) {
                    $problems[] = "React FeedStream has no {$name} prop";
                }
            }
        }

        return $problems;
    }

    /** @return list<string> */
    private function provideKeys(string $text): array
    {
        $vue = (string) file_get_contents($this->root.'/resources/js/vue/keys.ts');
        $react = (string) file_get_contents($this->root.'/resources/js/react/context.tsx');
        preg_match_all('/\bFEED_[A-Z_]+\b/', $text, $keys);

        return array_values(array_map(
            fn (string $key) => "Provide key {$key} exists in neither kit",
            array_filter(array_unique($keys[0]), fn (string $key) => ! preg_match('/export const '.$key.'\b/', $vue)
                && ! preg_match('/\b'.$key.'\?:/', $react)),
        ));
    }

    /** @return list<string> */
    private function imports(string $language, string $code): array
    {
        $problems = [];
        preg_match_all("/import\s+(?:type\s+)?(\{[^}]*\}|\w+)\s+from\s+'([^']+)'/", $code, $imports, PREG_SET_ORDER);
        foreach ($imports as [, $names, $specifier]) {
            $file = $this->moduleFile($specifier, $language);
            if ($file === false) {
                continue;
            }
            if ($file === null) {
                $problems[] = "Import '{$specifier}' resolves to no file in this package";

                continue;
            }
            if (! str_starts_with($names, '{')) {
                // A default import: a component file, or a module with a default export.
                if (! str_ends_with($file, '.vue') && ! str_contains((string) file_get_contents($file), 'export default')) {
                    $problems[] = "'{$specifier}' has no default export";
                }

                continue;
            }
            $exports = $this->exports($file);
            foreach (explode(',', trim($names, '{} ')) as $name) {
                $name = trim((string) preg_replace('/^type\s+|\s+as\s+\w+$/', '', trim($name)));
                if ($name !== '' && ! in_array($name, $exports, true)) {
                    $problems[] = "'{$specifier}' does not export {$name}";
                }
            }
        }

        return $problems;
    }

    /**
     * The package file an import names, null when it names a missing one,
     * or false for a module that is not this package's (the app's, npm's).
     */
    private function moduleFile(string $specifier, string $language): string|false|null
    {
        if (preg_match('#^@storyfeed/(.*)$#', $specifier, $match)) {
            $path = $match[1];
        } elseif (preg_match('#^@/components/storyfeed(?:/(.*))?$#', $specifier, $match)) {
            // A copied kit is the kit's directory with shared/ inside it.
            $kit = in_array($language, ['tsx', 'jsx', 'react'], true) ? 'react' : 'vue';
            $rest = $match[1] ?? '';
            $path = str_starts_with($rest, 'shared/') || $rest === 'shared' ? $rest : rtrim($kit.'/'.$rest, '/');
        } else {
            return false;
        }

        $base = $this->root.'/resources/js/'.$path;
        foreach (['', '.ts', '.tsx', '/index.ts', '/index.tsx'] as $suffix) {
            if (is_file($base.$suffix)) {
                return $base.$suffix;
            }
        }

        return null;
    }

    /** @return list<string> */
    private function exports(string $file, int $depth = 0): array
    {
        $source = (string) file_get_contents($file);
        preg_match_all('/export\s+(?:declare\s+)?(?:const|let|function|class|interface|type|enum)\s+(\w+)/', $source, $declared);
        $names = $declared[1];
        preg_match_all('/export\s+(?:type\s+)?\{([^}]*)\}/', $source, $lists);
        foreach ($lists[1] as $list) {
            foreach (explode(',', $list) as $entry) {
                $entry = trim((string) preg_replace('/^type\s+/', '', trim($entry)));
                if ($entry !== '') {
                    $names[] = preg_match('/\sas\s+(\w+)$/', $entry, $alias) ? $alias[1] : $entry;
                }
            }
        }
        preg_match_all("/export\s+(?:type\s+)?\*\s+from\s+'([^']+)'/", $source, $stars);
        foreach ($stars[1] as $relative) {
            $base = dirname($file).'/'.$relative;
            foreach (['.ts', '.tsx', '/index.ts', '/index.tsx'] as $suffix) {
                if ($depth < 4 && is_file($base.$suffix)) {
                    $names = [...$names, ...$this->exports($base.$suffix, $depth + 1)];

                    break;
                }
            }
        }

        return array_values(array_unique($names));
    }

    /** Props on Vue and React kit components inside code samples. @return list<string> */
    private function jsTags(string $language, string $code): array
    {
        $kit = match ($language) {
            'vue' => 'vue',
            'tsx', 'jsx' => 'react',
            default => null,
        };
        if ($kit === null) {
            return [];
        }

        $problems = [];
        preg_match_all('/<(Feed[A-Z]\w*|Entity[A-Z]\w*)\b'.self::ATTRIBUTES.'>/', $code, $tags, PREG_SET_ORDER);
        foreach ($tags as [, $component, $attributes]) {
            $file = $this->root.'/resources/js/'.$kit.'/'.$component.($kit === 'vue' ? '.vue' : '.tsx');
            // React's FeedProvider lives in context.tsx; its props are the FEED_* keys checked above.
            if ($component === 'FeedProvider' && $kit === 'react') {
                continue;
            }
            if (! is_file($file)) {
                $problems[] = "{$kit} component {$component} does not exist";

                continue;
            }
            $source = (string) file_get_contents($file);
            if ($kit === 'react') {
                // Shared node props live with FeedItem.
                $source .= (string) file_get_contents($this->root.'/resources/js/react/FeedItem.tsx');
            }
            foreach ($this->attributeNames($attributes) as $attribute) {
                $prop = $this->camel(ltrim($attribute, '@'));
                $declared = str_starts_with($attribute, '@')
                    ? (bool) preg_match('/defineEmits<\{[^}]*\b'.$prop.'\b/s', $source)
                    : (bool) preg_match('/\b'.$prop.'\??:|\b'.$prop.'\s*[,=}]/', $source);
                if (! $declared) {
                    $problems[] = "{$kit} {$component} has no {$attribute} prop";
                }
            }
        }

        return $problems;
    }

    /** @return list<string> */
    private function phpClasses(string $text): array
    {
        $problems = [];
        preg_match_all('/\\\\?(Storyfeed\\\\(?:Ui\\\\)?[A-Z]\w*(?:\\\\[A-Z]\w*)+)(?:::(\w+)\()?/', $text, $references, PREG_SET_ORDER);
        foreach ($references as $reference) {
            $class = $reference[1];
            if (! class_exists($class) && ! interface_exists($class)) {
                $problems[] = "PHP class {$class} does not exist";
            } elseif (isset($reference[2]) && $reference[2] !== '' && ! method_exists($class, $reference[2])) {
                $problems[] = "{$class}::{$reference[2]}() does not exist";
            }
        }

        return $problems;
    }

    /** @return list<string> */
    private function commands(string $text): array
    {
        $problems = [];
        $command = (string) file_get_contents($this->root.'/src/Commands/InstallUiCommand.php');
        preg_match_all('/storyfeed:ui\s+(\w+)((?:\s+--[\w-]+(?:=\S+)?)*)/', $text, $calls, PREG_SET_ORDER);
        foreach ($calls as [, $kit, $options]) {
            if (! in_array($kit, ['vue', 'react'], true) || ! is_dir($this->root.'/resources/js/'.$kit)) {
                $problems[] = "storyfeed:ui has no {$kit} kit";
            }
            preg_match_all('/--([\w-]+)/', $options, $named);
            foreach ($named[1] as $option) {
                if (! str_contains($command, '{--'.$option)) {
                    $problems[] = "storyfeed:ui has no --{$option} option";
                }
            }
        }
        preg_match_all('/--(diff|force|path)\b/', $text, $mentioned);
        foreach (array_unique($mentioned[1]) as $option) {
            if (! str_contains($command, '{--'.$option)) {
                $problems[] = "storyfeed:ui has no --{$option} option";
            }
        }

        $provider = (string) file_get_contents($this->root.'/src/UiServiceProvider.php');
        preg_match_all('/vendor:publish\s+--tag=([\w-]+)/', $text, $tags);
        foreach ($tags[1] as $tag) {
            if (! str_contains($provider, "'{$tag}'")) {
                $problems[] = "No publish tag {$tag}";
            }
        }

        return $problems;
    }

    /** @return list<string> */
    private function sources(string $text): array
    {
        preg_match_all('#vendor/storyfeed/ui/(resources/[\w/]+)#', $text, $paths);

        return array_values(array_map(
            fn (string $path) => "Path vendor/storyfeed/ui/{$path} does not exist",
            array_filter(array_unique($paths[1]), fn (string $path) => ! file_exists($this->root.'/'.rtrim($path, '/'))
                && ! file_exists($this->root.'/'.rtrim($path, '/').'.blade.php')),
        ));
    }

    /** @return list<string> */
    private function attributeNames(string $attributes): array
    {
        // Drop quoted values and JSX expressions so only names remain.
        $attributes = (string) preg_replace('/"[^"]*"|\{(?:[^{}]|\{(?:[^{}]|\{[^{}]*\})*\})*\}/', '', $attributes);
        preg_match_all('/(?:^|\s)((?:v-bind)?:?@?[\w-]+)(?==)/', $attributes, $names);

        return array_values(array_filter(
            array_map(fn (string $name) => (string) preg_replace('/^(?:v-bind)?:/', '', $name), $names[1]),
            fn (string $name) => ! in_array($name, self::GLOBAL_ATTRIBUTES, true),
        ));
    }

    private function camel(string $name): string
    {
        return lcfirst(str_replace(' ', '', ucwords(str_replace('-', ' ', $name))));
    }
}
