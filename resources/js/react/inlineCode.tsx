import type { ReactNode } from 'react';

/** Opt-in single-backtick code; text children are escaped by React, never parsed as HTML. */
export function inlineCode(text: string): ReactNode {
    return text.split(/(?<!`)`([^`]+)`(?!`)/g).map((part, index) =>
        index % 2 === 1
            ? <code key={index} className="rounded bg-muted px-[0.25em] py-[0.125em] font-mono text-[0.875em] text-foreground">{part}</code>
            : part,
    );
}
