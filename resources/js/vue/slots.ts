import { Comment, Fragment, Text, h, type FunctionalComponent, type VNode } from 'vue';

/** Nothing but comments, whitespace and empty fragments: what an empty slot renders. */
function rendersNothing(nodes: VNode[]): boolean {
    return nodes.every((node) => {
        if (node.type === Comment) return true;
        if (node.type === Text) return !String(node.children ?? '').trim();
        if (node.type === Fragment) return !Array.isArray(node.children) || rendersNothing(node.children as VNode[]);

        return false;
    });
}

/** The head row around a `#headline` slot. An empty slot draws no row at all. */
export const FeedHeadRow: FunctionalComponent = (_, { slots }) => {
    const content = slots.default?.() ?? [];

    return rendersNothing(content) ? null : h('div', { class: 'sf-head flex items-baseline gap-3' }, content);
};
