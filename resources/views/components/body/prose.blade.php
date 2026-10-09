@props(['body', 'entity' => null])
@if (filled($body['content'] ?? null))
    <figure {{ $attributes->class(['sf-prose-block m-0 min-w-0 max-w-144', 'sf-prose-block--verbatim' => $body['verbatim'] ?? false, 'rounded-lg bg-card px-4 py-3' => ! ($body['verbatim'] ?? false)]) }}>
@if (filled($body['title'] ?? null))<figcaption class="sf-prose__title mb-2 text-sm font-medium text-foreground">{{ $body['title'] }}</figcaption>
@endif
@if ($body['verbatim'] ?? false)
            <pre class="sf-verbatim m-0 max-h-96 overflow-auto rounded-lg bg-foreground px-4 py-3 font-mono text-sm leading-[1.55] whitespace-pre-wrap text-background dark:bg-background dark:text-foreground [overflow-wrap:anywhere] [&_code]:bg-transparent [&_code]:p-0 [&_code]:font-[inherit] [&_code]:text-inherit" tabindex="0"><code>{{ $body['content'] }}</code></pre>
@elseif (in_array($body['mediaType'] ?? null, ['text/markdown', 'text/html'], true))
            <div class="sf-rich-text max-h-96 overflow-auto prose max-w-none text-[length:inherit] [overflow-wrap:anywhere] [--tw-prose-body:var(--color-muted-foreground)] [--tw-prose-headings:var(--color-foreground)] [--tw-prose-lead:var(--color-muted-foreground)] [--tw-prose-links:var(--color-primary)] [--tw-prose-bold:var(--color-foreground)] [--tw-prose-counters:var(--color-muted-foreground)] [--tw-prose-bullets:var(--color-muted-foreground)] [--tw-prose-hr:var(--color-border)] [--tw-prose-quotes:var(--color-foreground)] [--tw-prose-quote-borders:var(--color-border)] [--tw-prose-captions:var(--color-muted-foreground)] [--tw-prose-kbd:var(--color-foreground)] [--tw-prose-code:var(--color-foreground)] [--tw-prose-pre-code:var(--color-foreground)] [--tw-prose-pre-bg:var(--color-border)] [--tw-prose-th-borders:var(--color-border)] [--tw-prose-td-borders:var(--color-border)] [&_li:has(>input)]:list-none [&_li>input]:my-0 [&_li>input]:-ms-[1.5em] [&_li>input]:me-[0.5em] [&_[align=center]]:text-center [&_[align=right]]:text-right" tabindex="0">{!! \Storyfeed\Ui\Support\RichText::render($body['content'], $body['mediaType']) !!}</div>
@else
            <p class="sf-prose m-0 text-base leading-[1.6] whitespace-pre-wrap sf-prose--scroll max-h-96 overflow-auto [overflow-wrap:anywhere]" tabindex="0">{{ $body['content'] }}</p>
@endif
    </figure>
@endif
