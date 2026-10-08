import MarkdownIt from 'markdown-it';
import sanitizeHtml from 'sanitize-html';

const markdown = new MarkdownIt({ html: false });
export function isRich(payload: Record<string, any>): boolean {
    return (
        !payload.verbatim &&
        ['text/markdown', 'text/html'].includes(payload.mediaType)
    );
}
export function renderProse(payload: Record<string, any>): string {
    if (!isRich(payload)) return '';
    const source = payload.content ?? '';
    return sanitizeHtml(
        payload.mediaType === 'text/markdown'
            ? markdown.render(source)
            : source,
        {
            allowedTags: [
                'p',
                'br',
                'strong',
                'em',
                's',
                'blockquote',
                'ul',
                'ol',
                'li',
                'h1',
                'h2',
                'h3',
                'h4',
                'h5',
                'h6',
                'pre',
                'code',
                'a',
                'hr',
            ],
            allowedAttributes: { a: ['href', 'title'], ol: ['start'] },
            allowedSchemes: ['http', 'https', 'mailto'],
            allowProtocolRelative: false,
        },
    );
}
