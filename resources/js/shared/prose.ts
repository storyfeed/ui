import { micromark } from 'micromark';
import { gfmAutolinkLiteral, gfmAutolinkLiteralHtml } from 'micromark-extension-gfm-autolink-literal';
import { gfmStrikethrough, gfmStrikethroughHtml } from 'micromark-extension-gfm-strikethrough';
import { gfmTable, gfmTableHtml } from 'micromark-extension-gfm-table';
import { gfmTaskListItem, gfmTaskListItemHtml } from 'micromark-extension-gfm-task-list-item';
import sanitizeHtml from 'sanitize-html';

// GitHub-flavoured Markdown, as Laravel's Str::markdown() renders it for Blade.
const markdown = (source: string): string =>
    micromark(source, {
        extensions: [gfmAutolinkLiteral(), gfmStrikethrough(), gfmTable(), gfmTaskListItem()],
        htmlExtensions: [gfmAutolinkLiteralHtml(), gfmStrikethroughHtml(), gfmTableHtml(), gfmTaskListItemHtml()],
    });
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
            ? markdown(source)
            : source,
        {
            allowedTags: [
                'p',
                'br',
                'strong',
                'em',
                's',
                'del',
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
                'table',
                'thead',
                'tbody',
                'tr',
                'th',
                'td',
                'input',
            ],
            allowedAttributes: {
                a: ['href', 'title'],
                ol: ['start'],
                th: ['align'],
                td: ['align'],
                input: ['type', 'checked', 'disabled'],
            },
            allowedSchemes: ['http', 'https', 'mailto'],
            allowProtocolRelative: false,
            // Keep an input only as a task list's read-only checkbox.
            exclusiveFilter: (frame) =>
                frame.tag === 'input' &&
                (String(frame.attribs.type).toLowerCase() !== 'checkbox' || !('disabled' in frame.attribs)),
            transformTags: {
                input: (_tag, attribs) => ({
                    tagName: 'input',
                    attribs: {
                        type: 'checkbox',
                        ...('disabled' in attribs ? { disabled: '' } : {}),
                        ...('checked' in attribs ? { checked: '' } : {}),
                    },
                }),
            },
        },
    );
}
