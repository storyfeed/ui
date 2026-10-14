import { h, type VNodeChild } from 'vue';

/** Opt-in single-backtick code; text children are escaped by Vue, never parsed as HTML. */
export function inlineCode(text: string): VNodeChild {
    return text.split(/(?<!`)`([^`]+)`(?!`)/g).map((part, index) =>
        index % 2 === 1
            ? h('code', { class: 'rounded bg-muted px-[0.25em] py-[0.125em] font-mono text-[0.875em] text-foreground' }, part)
            : part,
    );
}
