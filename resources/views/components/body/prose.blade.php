@props(['body', 'entity' => null])
@if (filled($body['content'] ?? null))
    <figure {{ $attributes->class(['sf-prose-block m-0 min-w-0 max-w-xl', 'sf-prose-block--verbatim' => $body['verbatim'] ?? false, 'rounded-lg bg-card px-4 py-3' => ! ($body['verbatim'] ?? false)]) }}>
@if (filled($body['title'] ?? null))<figcaption class="sf-prose__title mb-2 text-[13px] font-medium text-foreground">{{ $body['title'] }}</figcaption>
@endif
@if ($body['verbatim'] ?? false)
            <pre class="sf-verbatim m-0 max-h-96 overflow-auto rounded-lg bg-foreground px-4 py-3 font-mono text-[12.5px] leading-[1.55] whitespace-pre-wrap text-background dark:bg-background dark:text-foreground [overflow-wrap:anywhere] [&_code]:bg-transparent [&_code]:p-0 [&_code]:font-[inherit] [&_code]:text-inherit" tabindex="0"><code>{{ $body['content'] }}</code></pre>
@elseif (in_array($body['mediaType'] ?? null, ['text/markdown', 'text/html'], true))
            <div class="sf-rich-text max-h-96 overflow-auto text-[13.5px] leading-[1.6] [overflow-wrap:anywhere] [&>:first-child]:mt-0 [&>:last-child]:mb-0 [&_p]:my-2 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-[1.4rem] [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-[1.4rem] [&_blockquote]:my-2 [&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground [&_a]:text-primary [&_a]:underline [&_pre]:overflow-auto [&_pre]:rounded [&_pre]:bg-border [&_pre]:p-2 [&_:is(h1,h2,h3,h4,h5,h6)]:mt-3 [&_:is(h1,h2,h3,h4,h5,h6)]:mb-1.5 [&_:is(h1,h2,h3,h4,h5,h6)]:border-0 [&_:is(h1,h2,h3,h4,h5,h6)]:p-0 [&_:is(h1,h2,h3,h4,h5,h6)]:text-sm [&_:is(h1,h2,h3,h4,h5,h6)]:leading-[1.6] [&_:is(h1,h2,h3,h4,h5,h6)]:font-semibold" tabindex="0">{!! \Storyfeed\Ui\Support\RichText::render($body['content'], $body['mediaType']) !!}</div>
@else
            <p class="sf-prose m-0 text-[13.5px] leading-[1.6] whitespace-pre-wrap sf-prose--scroll max-h-96 overflow-auto [overflow-wrap:anywhere]" tabindex="0">{{ $body['content'] }}</p>
@endif
    </figure>
@endif
