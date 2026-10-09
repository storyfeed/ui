import { linkAttributes } from './linkAttributes';

/** Where a tap goes, and how the host's link component should open it. */
export interface ResolvedLink {
    href: string;
    modal: boolean;
    attributes: Record<string, string | number | boolean>;
}

type LinkLike = { href?: unknown; modal?: unknown; attributes?: unknown } | null | undefined;
type EntityLike = { url?: unknown; modal?: unknown; attributes?: unknown; link?: LinkLike; tombstone?: unknown } | null | undefined;

const attributesOf = (value: unknown) =>
    linkAttributes(value && typeof value === 'object' ? (value as Record<string, unknown>) : {});

/**
 * An entity's own link, read from either payload shape: core 0.17's one
 * `link` (`{href, modal, attributes}`, storyfeed/storyfeed#79) or core 0.16's
 * `url`, `modal` and `attributes`. Null when it has none or has been deleted.
 * Mirrors `Storyfeed\Ui\Support\Links`.
 */
export function entityLink(entity: EntityLike): ResolvedLink | null {
    if (!entity || entity.tombstone) return null;

    const link = entity.link && typeof entity.link === 'object' ? entity.link : null;
    const href = link ? link.href : entity.url;
    if (typeof href !== 'string' || href === '') return null;

    return {
        href,
        modal: (link ? link.modal : entity.modal) === true,
        attributes: attributesOf(link ? link.attributes : entity.attributes),
    };
}

/**
 * A link inside a body. One with an `href` goes there; one without is the
 * entity's own (`FeedLink::toEntity()`), and its `modal` and `attributes` add
 * to the entity's. Null when it leads nowhere.
 */
export function bodyLink(link: LinkLike, entity: ResolvedLink | null | undefined): ResolvedLink | null {
    if (!link || typeof link !== 'object') return null;

    const modal = link.modal === true;
    const attributes = attributesOf(link.attributes);
    if (typeof link.href === 'string' && link.href !== '') return { href: link.href, modal, attributes };

    return entity ? { href: entity.href, modal: entity.modal || modal, attributes: { ...entity.attributes, ...attributes } } : null;
}

/** The props a host link component receives: `modal` only when asked, and only for a component. */
export function linkProps(link: ResolvedLink, component: unknown): Record<string, string | number | boolean> {
    return { ...link.attributes, href: link.href, ...(component !== 'a' && link.modal ? { modal: true } : {}) };
}

/** The entity's own link a body resolves against: the resolved one, else a bare `entityUrl`. */
export function ownLink(link: ResolvedLink | null | undefined, url?: string | null): ResolvedLink | null {
    return link ?? (typeof url === 'string' && url !== '' ? { href: url, modal: false, attributes: {} } : null);
}
