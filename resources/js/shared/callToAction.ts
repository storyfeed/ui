import { linkAttributes } from './linkAttributes';

/**
 * Read a `Storyfeed/Body/CallToAction` as core's `CallToAction::upgrade()`
 * does: `subject` and `content` are optional, and an action needs its text
 * and a link. A link without an `href` goes to the body's own entity; with
 * neither, the action is left out. Null when there is nothing to draw.
 * Mirrors the Blade view.
 */
export function readCallToAction(
    payload: Record<string, any>,
    entityUrl?: string | null,
): {
    subject: string | null;
    content: string | null;
    action: { label: string; href: string; modal: boolean; attributes: Record<string, string | number | boolean> } | null;
} | null {
    const text = (value: unknown) => (typeof value === 'string' && value.trim() !== '' ? value : null);
    const subject = text(payload.subject);
    const content = text(payload.content);
    const label = text(payload.action?.label);
    const link = payload.action?.link;
    const href = link && typeof link === 'object' ? (text(link.href) ?? text(entityUrl)) : null;
    const action = label && href
        ? { label, href, modal: link.modal === true, attributes: linkAttributes(link.attributes && typeof link.attributes === 'object' ? link.attributes : {}) }
        : null;

    return subject || content || action ? { subject, content, action } : null;
}
