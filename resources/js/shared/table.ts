/** A Table cell: plain text, a number, nothing, or a link. Mirrors `Storyfeed\Ui\Support\TableBody`. */
export type TableCell = string | number | null | { label: string; href: string | null };

const list = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

const cell = (value: unknown): TableCell => {
    if (value === null || typeof value === 'string' || typeof value === 'number') return value;
    const link = value as Record<string, unknown> | undefined;

    return link && typeof link === 'object' && typeof link.label === 'string'
        ? { label: link.label, href: typeof link.href === 'string' ? link.href : null }
        : null;
};

/**
 * Read a `Storyfeed/Body/Table` as core's `Table::upgrade()` does: `title`,
 * `headers` and `footer` may be left out, a cell that is not one becomes an
 * empty cell (so the columns after it stay put), and every row is padded to
 * the widest. Null when there is no row to draw.
 */
export function readTable(payload: Record<string, any>): { title: string | null; headers: string[]; rows: TableCell[][]; footer: TableCell[][] } | null {
    const headers = list(payload.headers).map((header) => (typeof header === 'string' || typeof header === 'number' ? String(header) : ''));
    const rows = list(payload.rows).filter(Array.isArray).map((row) => (row as unknown[]).map(cell));
    const footer = list(payload.footer).filter(Array.isArray).map((row) => (row as unknown[]).map(cell));
    if (!rows.length && !footer.length) return null;

    const width = Math.max(headers.length, ...rows.map((row) => row.length), ...footer.map((row) => row.length));
    const pad = (row: TableCell[]) => [...row, ...Array<TableCell>(width - row.length).fill(null)];

    return {
        title: typeof payload.title === 'string' && payload.title !== '' ? payload.title : null,
        headers: headers.length ? [...headers, ...Array<string>(width - headers.length).fill('')] : [],
        rows: rows.map(pad),
        footer: footer.map(pad),
    };
}
