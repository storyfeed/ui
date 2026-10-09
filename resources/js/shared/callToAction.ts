import { bodyLink, type ResolvedLink } from './link';

/**
 * Read a `Storyfeed/Body/CallToAction` as core's `CallToAction::upgrade()`
 * does: `subject` and `content` are optional, and an action needs its text
 * and a link. A link without an `href` goes to the body's own entity; with
 * neither, the action is left out. Null when there is nothing to draw.
 * Mirrors the Blade view.
 */
export function readCallToAction(
    payload: Record<string, any>,
    entity?: ResolvedLink | null,
): {
    subject: string | null;
    content: string | null;
    action: (ResolvedLink & { label: string }) | null;
} | null {
    const text = (value: unknown) => (typeof value === 'string' && value.trim() !== '' ? value : null);
    const subject = text(payload.subject);
    const content = text(payload.content);
    const label = text(payload.action?.label);
    const link = bodyLink(payload.action?.link, entity);
    const action = label && link ? { ...link, label } : null;

    return subject || content || action ? { subject, content, action } : null;
}
