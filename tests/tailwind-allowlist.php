<?php

// Exact reviewed snippets, never file-wide exemptions. Counts reject duplicate uses.
return json_decode(<<<'JSON'
{
    "resources/js/vue/EntityAvatar.vue": [
        {
            "pattern": ":style=\"color ? { backgroundColor: color } : undefined\"",
            "reason": "Avatar colour is arbitrary payload data, not a finite Tailwind palette.",
            "count": 1
        }
    ],
    "resources/js/vue/FeedItem.vue": [
        {
            "pattern": "...(frame.style ? { style: frame.style } : {}),",
            "reason": "Body maxHeight accepts arbitrary validated runtime CSS lengths.",
            "count": 1
        }
    ],
    "resources/js/vue/FeedMedia.vue": [
        {
            "pattern": ":style=\"image.width && image.height ? { aspectRatio: `${image.width} / ${image.height}` } : undefined\"",
            "reason": "Picture dimensions and ratios are arbitrary runtime payload data.",
            "count": 1
        }
    ],
    "resources/js/vue/body/MediaObject.vue": [
        {
            "pattern": "<div v-if=\"picture && placement === 'beside'\" :class=\"frame.wrapper\" :style=\"shape.shape === 'ratio' ? { '--sf-picture-ratio': shape.ratio } : undefined\">",
            "reason": "Picture dimensions and ratios are arbitrary runtime payload data.",
            "count": 1
        }
    ],
    "resources/js/react/EntityAvatar.tsx": [
        {
            "pattern": "style={color ? { backgroundColor: color } : undefined}",
            "reason": "Avatar colour is arbitrary payload data, not a finite Tailwind palette.",
            "count": 1
        }
    ],
    "resources/js/react/FeedStream.tsx": [
        {
            "pattern": "style={style}",
            "reason": "Host callers may supply arbitrary runtime CSS variables; Tailwind cannot precompile their values.",
            "count": 1
        }
    ],
    "resources/js/react/FeedItem.tsx": [
        {
            "pattern": "style={frame.style as CSSProperties | undefined}",
            "reason": "Body maxHeight accepts arbitrary validated runtime CSS lengths.",
            "count": 1
        }
    ],
    "resources/js/react/FeedMedia.tsx": [
        {
            "pattern": "style={\n                image.width && image.height\n                    ? { aspectRatio: `${image.width} / ${image.height}` }\n                    : undefined\n            }",
            "reason": "Picture dimensions and ratios are arbitrary runtime payload data.",
            "count": 1
        }
    ],
    "resources/js/react/body/index.tsx": [
        {
            "pattern": "style={\n                        shape.shape === 'ratio'\n                            ? ({ '--sf-picture-ratio': shape.ratio } as CSSProperties)\n                            : undefined\n                    }",
            "reason": "Picture dimensions and ratios are arbitrary runtime payload data.",
            "count": 1
        }
    ],
    "resources/views/components/avatar.blade.php": [
        {
            "pattern": "])->merge(['style' => $color !== null ? 'background-color: '.$color : null]) }}>",
            "reason": "Avatar colour is arbitrary payload data, not a finite Tailwind palette.",
            "count": 1
        }
    ],
    "resources/views/components/body.blade.php": [
        {
            "pattern": "$frame = is_array($body) ? \\Storyfeed\\Ui\\Support\\Bodies::frame($body) : ['style' => null, 'capped' => false];",
            "reason": "Body maxHeight accepts arbitrary validated runtime CSS lengths.",
            "count": 1
        },
        {
            "pattern": "->merge(array_filter(['style' => $frame['style'], 'tabindex' => $frame['capped'] ? '0' : null], fn ($value) => $value !== null));",
            "reason": "Body maxHeight accepts arbitrary validated runtime CSS lengths.",
            "count": 1
        }
    ],
    "resources/views/components/media.blade.php": [
        {
            "pattern": "<a href=\"{{ $href }}\" {{ $attributes->merge($linkAttributes)->merge(['class' => 'sf-media mt-2 block max-w-88 overflow-hidden rounded-lg bg-muted [&>img]:block [&>img]:size-full [&>img]:object-cover', 'style' => $ratio]) }}><img src=\"{{ $image['src'] }}\" alt=\"{{ $image['alt'] ?? '' }}\" width=\"{{ $image['width'] ?? '' }}\" height=\"{{ $image['height'] ?? '' }}\" loading=\"lazy\"></a>",
            "reason": "Picture dimensions and ratios are arbitrary runtime payload data.",
            "count": 1
        },
        {
            "pattern": "<div {{ $attributes->merge(['class' => 'sf-media mt-2 block max-w-88 overflow-hidden rounded-lg bg-muted [&>img]:block [&>img]:size-full [&>img]:object-cover', 'style' => $ratio]) }}><img src=\"{{ $image['src'] }}\" alt=\"{{ $image['alt'] ?? '' }}\" width=\"{{ $image['width'] ?? '' }}\" height=\"{{ $image['height'] ?? '' }}\" loading=\"lazy\"></div>",
            "reason": "Picture dimensions and ratios are arbitrary runtime payload data.",
            "count": 1
        }
    ],
    "resources/views/components/body/media-object.blade.php": [
        {
            "pattern": "<div class=\"{{ $frame }}\" @if ($ratio !== null) style=\"--sf-picture-ratio: {{ $ratio }}\" @endif><x-storyfeed::media :image=\"$picture\" :renderer=\"$mediaRenderer\" :class=\"$frameMedia\" /></div>",
            "reason": "Picture dimensions and ratios are arbitrary runtime payload data.",
            "count": 1
        }
    ]
}
JSON, true, flags: JSON_THROW_ON_ERROR);
