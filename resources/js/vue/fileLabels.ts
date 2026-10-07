/** Presentation labels for MIME types, shared with the Blade kit's FileLabels. */
export const fileLabels: Readonly<Record<string, string>> = {
    'application/pdf': 'PDF',
    'text/markdown': 'Markdown',
    'text/csv': 'Spreadsheet (CSV)',
    'application/msword': 'Word document',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Word document',
    'application/vnd.ms-excel': 'Excel spreadsheet',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'Excel spreadsheet',
    'application/zip': 'ZIP archive',
    'text/plain': 'Text file',
    'image/jpeg': 'JPEG image',
    'image/png': 'PNG image',
    'image/gif': 'GIF image',
    'image/webp': 'WebP image',
    'image/svg+xml': 'SVG image',
};

export type FileLabelInput = { name: string | null; mediaType: string | null };
export type FileLabeller = (file: FileLabelInput) => string | null;

export function fileLabel(file: FileLabelInput, labeller?: FileLabeller | null): string | null {
    return labeller?.(file) ?? (file.mediaType ? fileLabels[file.mediaType] ?? file.mediaType : null);
}
