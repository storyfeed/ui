<?php

// Debt is frozen at an empty baseline: burn it down, never add it.
return json_decode(<<<'JSON'
{
    "resources/js/vue/EntityAvatar.vue": [
        {
            "pattern": ":style=\"color ? { '--sf-avatar-color': color } : undefined\"",
            "reason": "per-entity runtime colour (app avatar_color or hashed palette); value only, appearance in utilities",
            "count": 1,
            "kind": "genuine",
            "legacy_pattern": ":style=\"color ? { backgroundColor: color } : undefined\"",
            "migration": "Exact pre-variable binding also accepted so the guard is independent of the pending avatar change."
        }
    ],
    "resources/js/vue/FeedItem.vue": [
        {
            "pattern": "...(frame.style ? { style: frame.style } : {}),",
            "reason": "Body maxHeight accepts arbitrary validated runtime CSS lengths.",
            "count": 1,
            "kind": "genuine"
        }
    ],
    "resources/js/vue/FeedMedia.vue": [
        {
            "pattern": ":style=\"image.width && image.height ? { aspectRatio: `${image.width} / ${image.height}` } : undefined\"",
            "reason": "Picture dimensions and ratios are arbitrary runtime payload data.",
            "count": 1,
            "kind": "genuine"
        }
    ],
    "resources/js/vue/body/MediaObject.vue": [
        {
            "pattern": "<div v-if=\"picture && placement === 'beside'\" :class=\"frame.wrapper\" :style=\"shape.shape === 'ratio' ? { '--sf-picture-ratio': shape.ratio } : undefined\">",
            "reason": "Picture dimensions and ratios are arbitrary runtime payload data.",
            "count": 1,
            "kind": "genuine"
        }
    ],
    "resources/js/react/EntityAvatar.tsx": [
        {
            "pattern": "style={color ? ({ '--sf-avatar-color': color } as CSSProperties) : undefined}",
            "reason": "per-entity runtime colour (app avatar_color or hashed palette); value only, appearance in utilities",
            "count": 1,
            "kind": "genuine",
            "legacy_pattern": "style={color ? { backgroundColor: color } : undefined}",
            "migration": "Exact pre-variable binding also accepted so the guard is independent of the pending avatar change."
        }
    ],
    "resources/js/react/FeedStream.tsx": [
        {
            "pattern": "style={style}",
            "reason": "Host callers may supply arbitrary runtime CSS variables; Tailwind cannot precompile their values.",
            "count": 1,
            "kind": "genuine"
        }
    ],
    "resources/js/react/FeedItem.tsx": [
        {
            "pattern": "style={frame.style as CSSProperties | undefined}",
            "reason": "Body maxHeight accepts arbitrary validated runtime CSS lengths.",
            "count": 1,
            "kind": "genuine"
        }
    ],
    "resources/js/react/FeedMedia.tsx": [
        {
            "pattern": "style={\n                image.width && image.height\n                    ? { aspectRatio: `${image.width} / ${image.height}` }\n                    : undefined\n            }",
            "reason": "Picture dimensions and ratios are arbitrary runtime payload data.",
            "count": 1,
            "kind": "genuine"
        }
    ],
    "resources/js/react/body/index.tsx": [
        {
            "pattern": "style={\n                        shape.shape === 'ratio'\n                            ? ({ '--sf-picture-ratio': shape.ratio } as CSSProperties)\n                            : undefined\n                    }",
            "reason": "Picture dimensions and ratios are arbitrary runtime payload data.",
            "count": 1,
            "kind": "genuine"
        }
    ],
    "resources/views/components/avatar.blade.php": [
        {
            "pattern": "])->merge(array_filter(['style' => $color !== null ? '--sf-avatar-color: '.$color : null])) }}>",
            "reason": "per-entity runtime colour (app avatar_color or hashed palette); value only, appearance in utilities",
            "count": 1,
            "kind": "genuine",
            "legacy_pattern": "])->merge(['style' => $color !== null ? 'background-color: '.$color : null]) }}>",
            "migration": "Exact pre-variable binding also accepted so the guard is independent of the pending avatar change."
        }
    ],
    "resources/views/components/body.blade.php": [
        {
            "pattern": "$frame = is_array($body) ? \\Storyfeed\\Ui\\Support\\Bodies::frame($body) : ['style' => null, 'capped' => false];",
            "reason": "Body maxHeight accepts arbitrary validated runtime CSS lengths.",
            "count": 1,
            "kind": "genuine"
        },
        {
            "pattern": "->merge(array_filter(['style' => $frame['style'], 'tabindex' => $frame['capped'] ? '0' : null], fn ($value) => $value !== null));",
            "reason": "Body maxHeight accepts arbitrary validated runtime CSS lengths.",
            "count": 1,
            "kind": "genuine"
        }
    ],
    "resources/views/components/media.blade.php": [
        {
            "pattern": "<a href=\"{{ $href }}\" {{ $attributes->merge($linkAttributes)->merge(['class' => 'sf-media mt-2 block max-w-88 overflow-hidden rounded-lg bg-muted [&>img]:block [&>img]:size-full [&>img]:object-cover', 'style' => $ratio]) }}><img src=\"{{ $image['src'] }}\" alt=\"{{ $image['alt'] ?? '' }}\" width=\"{{ $image['width'] ?? '' }}\" height=\"{{ $image['height'] ?? '' }}\" loading=\"lazy\"></a>",
            "reason": "Picture dimensions and ratios are arbitrary runtime payload data.",
            "count": 1,
            "kind": "genuine"
        },
        {
            "pattern": "<div {{ $attributes->merge(['class' => 'sf-media mt-2 block max-w-88 overflow-hidden rounded-lg bg-muted [&>img]:block [&>img]:size-full [&>img]:object-cover', 'style' => $ratio]) }}><img src=\"{{ $image['src'] }}\" alt=\"{{ $image['alt'] ?? '' }}\" width=\"{{ $image['width'] ?? '' }}\" height=\"{{ $image['height'] ?? '' }}\" loading=\"lazy\"></div>",
            "reason": "Picture dimensions and ratios are arbitrary runtime payload data.",
            "count": 1,
            "kind": "genuine"
        }
    ],
    "resources/views/components/body/media-object.blade.php": [
        {
            "pattern": "<div class=\"{{ $frame }}\" @if ($ratio !== null) style=\"--sf-picture-ratio: {{ $ratio }}\" @endif><x-storyfeed::media :image=\"$picture\" :renderer=\"$mediaRenderer\" :class=\"$frameMedia\" /></div>",
            "reason": "Picture dimensions and ratios are arbitrary runtime payload data.",
            "count": 1,
            "kind": "genuine"
        }
    ]
}
JSON, true, flags: JSON_THROW_ON_ERROR);
