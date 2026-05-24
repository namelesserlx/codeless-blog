import path from 'node:path';

export const blogAppRoot = path.resolve(__dirname, '..');

export function fromBlogApp(...segments: string[]) {
    return path.join(blogAppRoot, ...segments);
}
