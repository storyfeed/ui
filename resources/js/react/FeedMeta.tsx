import { Fragment, isValidElement, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { leftoverRoles } from '../shared/meta';
import { formatRange } from '../shared/range';
import type { FeedNode } from '../shared/types';
import { EntityList } from './FeedHeadline';
function hasContent(node: ReactNode): boolean {
    if (node === null || node === undefined || typeof node === 'boolean') return false;
    if (typeof node === 'string') return Boolean(node.trim());
    if (Array.isArray(node)) return node.some(hasContent);
    if (isValidElement<{ children?: ReactNode }>(node) && (node.type === Fragment || typeof node.type === 'string')) return hasContent(node.props.children);
    return true;
}
export default function FeedMeta({
    node,
    templates,
    children,
}: {
    node: FeedNode;
    templates: (string | null | undefined)[];
    children?: ReactNode;
}) {
    const roles = leftoverRoles(node, templates);
    // The server and the first hydration render read the range in UTC; the browser's zone after mount.
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);
    const range = formatRange(node, !mounted);
    const time = hasContent(children);
    if (!range && !roles.length && !time) return null;
    return (
        <div className="sf-meta mt-0.5 text-sm leading-[1.5] text-muted-foreground [overflow-wrap:anywhere] [&_.sf-entity]:text-inherit [&_.sf-entity]:font-normal">
            {children}
            {range && (
                <>
                    {time ? ' · ' : ''}
                    <span className="sf-meta__range">{range}</span>
                </>
            )}
            {roles.map((part) => (
                <Fragment key={part.role}>
                    {' · '}
                    <span className="sf-meta__role">
                        {part.word + ' '}
                        <EntityList
                            entities={part.entities}
                            overflow={part.overflow}
                        />
                    </span>
                </Fragment>
            ))}
        </div>
    );
}
