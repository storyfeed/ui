import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';

// Serves build/ to the workbench harnesses. With STORYFEED_HOST=bare (ui#28)
// every stylesheet a kit's page loads is swapped for workbench/bare/<kit>.css,
// built by `npm run workbench:bare`: the same markup, in a host that sets
// nothing a consumer would have to add.
export const bare = process.env.STORYFEED_HOST === 'bare';
export const pages = { blade: 'workbench/parity.html', vue: 'vue/index.html', react: 'react/index.html' };
const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg' };
const kitOf = pathname => pathname.startsWith('/workbench/') ? 'blade' : pathname.startsWith('/react/') ? 'react' : 'vue';

export async function serve() {
    const server = createServer(async (req, res) => {
        const url = new URL(req.url, 'http://localhost');
        try {
            let path = resolve('build', url.pathname.startsWith('/assets/') ? 'vue' + url.pathname : url.pathname.slice(1));
            if (bare && extname(path) === '.css') path = resolve('build/bare', `${kitOf(url.pathname)}.css`);
            res.setHeader('Content-Type', types[extname(path)] ?? 'text/plain');
            res.end(await readFile(path));
        } catch { res.writeHead(404).end(); }
    });
    await new Promise(r => server.listen(0, '127.0.0.1', r));
    return { server, origin: `http://127.0.0.1:${server.address().port}` };
}
