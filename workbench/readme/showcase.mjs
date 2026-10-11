// Builds the core README's showcase from the kits' real output.
//
// ReadmeTest.php records a small made-up world through core and writes each
// state of the arc as Blade markup (build/readme/states.json); kits.mjs adds
// the closing feed as the Vue and React kits render it. This script stacks the
// states as layers in one page, styles them with the Tailwind classes they
// use, measures their rows, and writes one SVG per theme whose CSS keyframes
// play the arc: rows gain their people and bodies, a run of rows collapses
// into a group, photos arrive and regroup, the feed narrows to one person,
// and the three kits hold side by side before dissolving back into the
// opening row. No script runs in the SVG; GitHub draws it as an image.
//
// It also writes a PNG still of the closing frame, for reduced motion.
//
//   npm run readme:showcase    writes to STORYFEED_README_OUT (default ../storyfeed/art/samples)
import { chromium } from 'playwright';
import { readFile, writeFile, mkdir, stat } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import { spawnSync } from 'node:child_process';

const out = resolve(process.env.STORYFEED_README_OUT ?? '../storyfeed/art/samples');
const states = JSON.parse(await readFile('build/readme/states.json', 'utf8'));
const kits = JSON.parse(await readFile('build/readme/kits.json', 'utf8'));
const css = await readFile('build/readme/readme.css', 'utf8');
await mkdir(out, { recursive: true });

const WIDTH = 800;
const HEIGHT = 520;
const LOOP = 18.4;

// The arc, in seconds. Each beat builds on the one before; the collapse, the
// live run and the closing frame get the most time, and the live arrivals
// come faster and faster, as mod's tree does.
const T = {
    rich: 1.6, richRows: [2.0, 2.4],
    joins: 4.0, joinArrivals: [4.15, 4.5, 4.85, 5.2, 5.5], collapse: 6.3,
    photos: [7.5, 8.55, 9.4, 10.05, 10.6],
    scoped: 11.9,
    kits: 14.0, kitStagger: 0.25,
    dissolve: 17.6,
};

const ORDER = ['plain', 'rich', 'joins', 'joined', 'photos1', 'photos2', 'photos3', 'photos4', 'photos5', 'scoped', 'kits'];
const feed = (html, extra = '') => `<div class="px-6 pt-4">${extra}${html}</div>`;
const caption = text => `<div class="absolute right-6 top-4 rounded-full bg-muted px-3 py-1 text-[13px] text-muted-foreground">${text}</div>`;
const kit = (name, html) => `<div class="kitcol min-w-0"><div class="mb-2 text-[13px] font-semibold text-muted-foreground">${name}</div><div style="--sf-font-size:0.8125rem">${html}</div></div>`;
const LAYERS = {
    ...Object.fromEntries(ORDER.filter(key => states[key]).map(key => [key, feed(states[key])])),
    scoped: feed(states.scoped, caption('Sam Ortega’s feed')),
    kits: `<div class="grid grid-cols-3 gap-5 px-6 pt-4">${kit('Blade', states.final)}${kit('Vue', kits.vue)}${kit('React', kits.react)}</div>`,
};

// Keyframes from [seconds, declarations] pairs, eased between them.
let names = 0;
const pct = seconds => `${+(100 * seconds / LOOP).toFixed(3)}%`;
const animate = (selector, frames) => {
    const name = `a${names++}`;
    const sorted = [...frames].sort((a, b) => a[0] - b[0]);
    const all = [[0, sorted[0][1]], ...sorted, [LOOP, sorted.at(-1)[1]]];
    return `${selector}{animation:${name} ${LOOP}s cubic-bezier(.3,0,.2,1) infinite}@keyframes ${name}{${all.map(([t, d]) => `${pct(t)}{${d}}`).join('')}}`;
};
const shown = (t, y = 0) => `opacity:1;transform:translateY(${y}px)`;
const hidden = (y = 0) => `opacity:0;transform:translateY(${y}px)`;

// Builds every rule once the rows are measured: tops[layer] lists each row's
// offset from its feed's first row.
const timeline = tops => {
    const rules = [];
    const layer = key => `.L-${key}`;
    const row = (key, i) => `${layer(key)} .R${i}`;
    const fade = (key, inAt, outAt, inFor = 0.3, outFor = 0.3) => rules.push(animate(layer(key), [[inAt - inFor, 'opacity:0'], [inAt, 'opacity:1'], [outAt, 'opacity:1'], [outAt + outFor, 'opacity:0']]));

    // 1. One plain row: shown at the start, and dissolving back in as the
    // closing frame fades, so the last frame is the first.
    rules.push(animate(layer('plain'), [[0, 'opacity:1'], [T.rich, 'opacity:1'], [T.rich + 0.3, 'opacity:0'], [T.dissolve - 0.05, 'opacity:0'], [T.dissolve + 0.5, 'opacity:1']]));

    // 2. The same row with its people, then the rows under it with their bodies.
    fade('rich', T.rich + 0.3, T.joins);
    T.richRows.forEach((at, n) => rules.push(animate(row('rich', n + 1), [[at, hidden(-6)], [at + 0.35, shown()]])));

    // 3. Joins arrive one by one at the top, pushing the feed down: the rows
    // below slide first, then the new row fades in where they made room.
    const joins = tops.joins;
    const arrivals = T.joinArrivals.map((at, k) => ({ at, first: 4 - k }));
    const lift = first => `transform:translateY(${-joins[first]}px)`;
    rules.push(animate(layer('joins'), [[T.joins, 'opacity:0'], [T.joins + 0.01, 'opacity:1'], [T.collapse + 0.45, 'opacity:1'], [T.collapse + 0.6, 'opacity:0']]));
    joins.forEach((_, i) => {
        const frames = [[T.joins, `opacity:${i >= 5 ? 1 : 0};${lift(5)}`]];
        arrivals.forEach(({ at, first }, k) => {
            const before = k ? arrivals[k - 1].first : 5;
            if (i === first) frames.push([at, `opacity:0;${lift(first)}`], [at + 0.12, `opacity:0;${lift(first)}`], [at + 0.35, `opacity:1;${lift(first)}`]);
            else frames.push([at, `opacity:${i >= before ? 1 : 0};${lift(before)}`], [at + 0.25, `opacity:${i >= first ? 1 : 0};${lift(first)}`]);
        });
        // The fold: each join slides up under the top one and fades, and the
        // rows below glide to where they sit under the grouped row.
        const below = tops.joined[i - 4] ?? joins[i];
        if (i >= 1 && i <= 4) frames.push([T.collapse + 0.22, `opacity:0;transform:translateY(${Math.round(-joins[i] * 0.6)}px)`]);
        frames.push([T.collapse, 'opacity:1;transform:translateY(0px)'],
            [T.collapse + 0.45, i === 0 ? 'opacity:1;transform:translateY(0px)' : i <= 4 ? `opacity:0;transform:translateY(${-joins[i]}px)` : `opacity:1;transform:translateY(${below - joins[i]}px)`]);
        rules.push(animate(row('joins', i), frames));
    });
    fade('joined', T.collapse + 0.6, T.photos[0], 0.2, 0.01);

    // 4. Photos: the first two arrive at the top and push the feed down; from
    // the third on, the rows regroup into one.
    T.photos.forEach((at, n) => {
        const key = `photos${n + 1}`;
        const next = T.photos[n + 1] ?? T.scoped;
        if (n < 2) {
            const h = tops[key][1];
            fade(key, at + 0.01, next, 0.01, n === 1 ? 0.18 : 0.01);
            rules.push(animate(row(key, 0), [[at, 'opacity:0'], [at + 0.2, 'opacity:0'], [at + 0.45, 'opacity:1']]));
            tops[key].slice(1).forEach((_, i) => rules.push(animate(row(key, i + 1), [[at, `transform:translateY(${-h}px)`], [at + 0.35, 'transform:translateY(0px)']])));
        } else {
            fade(key, at + 0.25, next, 0.25, next === T.scoped ? 0.4 : 0.18);
        }
    });

    // 5. The feed narrows to everything one person touched.
    fade('scoped', T.scoped + 0.4, T.kits - 0.3, 0.4, 0.3);

    // 6. The three kits, side by side, hold, then dissolve into the opening row.
    rules.push(animate(layer('kits'), [[T.kits, 'opacity:0'], [T.kits + 0.01, 'opacity:1'], [T.dissolve - 0.1, 'opacity:1'], [T.dissolve + 0.45, 'opacity:0']]));
    [0, 1, 2].forEach(n => rules.push(animate(`${layer('kits')} .kitcol:nth-child(${n + 1})`, [[T.kits + n * T.kitStagger, hidden(10)], [T.kits + n * T.kitStagger + 0.45, shown()]])));
    return rules.join('');
};
// Reduced motion, where the viewer passes it through: the closing frame, still.
const still = '@media (prefers-reduced-motion:reduce){#stage *{animation:none!important}.layer{opacity:0}.L-kits{opacity:1}}';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: WIDTH, height: 900 }, deviceScaleFactor: 2 });
await page.route('http://readme.test/**', async route => {
    const path = new URL(route.request().url()).pathname.slice(1);
    const file = path === 'media/fireworks.jpg' ? 'workbench/readme/media/fireworks.jpg' : path.startsWith('media/') ? `workbench/${path}` : `build/readme/${path}`;
    try {
        await route.fulfill({ body: await readFile(file), contentType: { '.css': 'text/css', '.jpg': 'image/jpeg', '.html': 'text/html' }[extname(file)] });
    } catch {
        await route.fulfill({ status: 404 });
    }
});

const sizes = [];
try {
    for (const theme of ['light', 'dark']) {
        names = 0;
        const body = ORDER.map(key => `<div class="layer L-${key} absolute inset-x-0 top-0">${LAYERS[key]}</div>`).join('')
            + '<div class="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-linear-to-b from-transparent to-background"></div>';
        await writeFile('build/readme/page.html', `<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="readme.css"></head><body style="margin:0"><div id="stage" class="${theme} relative overflow-hidden bg-background text-foreground font-sans text-[16px] leading-normal antialiased" style="width:${WIDTH}px;height:${HEIGHT}px">${body}</div></body></html>`);
        await page.goto('http://readme.test/page.html');
        const { tops, pictures } = await page.evaluate(async ({ height }) => {
            await document.fonts.ready;
            for (const image of document.images) image.loading = 'eager';
            await Promise.all([...document.images].map(image => image.decode().catch(() => {})));
            // What no frame draws: a closed group's members, anything hidden, rows far below the fold.
            document.querySelectorAll('details:not([open])').forEach(details => [...details.children].forEach(child => child.tagName === 'SUMMARY' || child.remove()));
            [...document.querySelectorAll('#stage *')].filter(element => getComputedStyle(element).display === 'none').forEach(element => element.remove());
            const tops = {};
            for (const layer of document.querySelectorAll('.layer')) {
                const key = [...layer.classList].find(name => name.startsWith('L-')).slice(2);
                const feed = layer.querySelector('[role=feed]');
                if (!feed || key === 'kits') continue;
                const rows = [...feed.children].filter(child => child.tagName === 'ARTICLE');
                const first = rows[0].getBoundingClientRect().top;
                rows.forEach((row, i) => row.classList.add(`R${i}`));
                tops[key] = rows.map(row => Math.round(row.getBoundingClientRect().top - first));
                rows.filter(row => row.getBoundingClientRect().top - layer.getBoundingClientRect().top > height + 200).forEach(row => row.remove());
            }
            // Each picture once per size it is drawn at, as WebP at twice that size.
            const largest = new Map();
            for (const image of document.images) {
                const box = image.getBoundingClientRect();
                const src = image.getAttribute('src');
                const [w, h] = largest.get(src) ?? [0, 0];
                largest.set(src, [Math.max(w, box.width), Math.max(h, box.height)]);
            }
            // Each picture is written once, in the stylesheet, and every <img>
            // drawing it points there with `content`, which Chromium, WebKit and
            // Firefox all honour in an SVG drawn as an image.
            const encoded = new Map();
            for (const image of [...document.images]) {
                const src = image.getAttribute('src');
                if (!encoded.has(src)) {
                    const [w, h] = largest.get(src);
                    const canvas = document.createElement('canvas');
                    canvas.width = Math.max(1, Math.round(w * 2)); canvas.height = Math.max(1, Math.round(h * 2));
                    const scale = Math.max(canvas.width / image.naturalWidth, canvas.height / image.naturalHeight);
                    canvas.getContext('2d').drawImage(image, (canvas.width - image.naturalWidth * scale) / 2, (canvas.height - image.naturalHeight * scale) / 2, image.naturalWidth * scale, image.naturalHeight * scale);
                    encoded.set(src, canvas.toDataURL('image/webp', 0.5));
                }
                image.classList.add(`p${[...encoded.keys()].indexOf(src)}`);
                image.removeAttribute('src');
                image.removeAttribute('srcset');
                image.removeAttribute('loading');
            }
            return { tops, pictures: [...encoded.values()].map((url, n) => `.p${n}{content:url(${url})}`).join('') };
        }, { height: HEIGHT });

        // Short class names: every class the stylesheet styles gets one, and
        // the rest (hooks no rule reads) are dropped. The timeline's own names stay.
        const tokens = await page.evaluate(() => [...new Set([...document.querySelectorAll('#stage, #stage [class]')].flatMap(element => [...element.classList]))]);
        const keep = token => /^(layer|L-.+|R\d+|kitcol|p\d+)$/.test(token);
        const escape = token => token.replace(/[^a-zA-Z0-9_-]/g, ch => `\\${ch}`).replace(/^(\d)/, '\\3$1 ');
        const map = {};
        let styled = css;
        tokens.filter(token => !keep(token)).sort((a, b) => b.length - a.length).forEach(token => {
            const pattern = new RegExp(`\\.${escape(token).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![a-zA-Z0-9_\\\\-])`, 'g');
            if (!pattern.test(styled)) return;
            map[token] = `c${Object.keys(map).length.toString(36)}`;
            styled = styled.replace(pattern, `.${map[token]}`);
        });
        await page.evaluate(map => document.querySelectorAll('#stage, #stage [class]').forEach(element => {
            const names = [...element.classList].map(name => /^(layer|L-.+|R\d+|kitcol|p\d+)$/.test(name) ? name : map[name]).filter(Boolean);
            names.length ? element.setAttribute('class', names.join(' ')) : element.removeAttribute('class');
        }), map);

        const xhtml = await page.evaluate(() => new XMLSerializer().serializeToString(document.getElementById('stage')));
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" role="img" aria-label="A Storyfeed feed growing: one plain row gains avatars, a photo and a key-value card; five volunteers joining fold into one grouped row; photos arrive live and regroup with a strip of thumbnails; the feed narrows to one person; then the Blade, Vue and React kits render the same feed side by side."><style><![CDATA[${styled}${pictures}${timeline(tops)}${still}]]></style><foreignObject width="${WIDTH}" height="${HEIGHT}">${xhtml}</foreignObject></svg>`;
        await writeFile(resolve(out, `showcase-${theme}.svg`), svg);
        sizes.push(`showcase-${theme}.svg ${WIDTH}×${HEIGHT} ${Math.round(svg.length / 1024)} KB`);

        // The reduced-motion still: the closing frame.
        const shot = await browser.newPage({ viewport: { width: WIDTH, height: HEIGHT }, deviceScaleFactor: 2, reducedMotion: 'reduce' });
        await shot.setContent(`<body style="margin:0">${svg}</body>`);
        await shot.waitForTimeout(300);
        await shot.locator('svg').first().screenshot({ path: resolve(out, `showcase-${theme}.png`) });
        await shot.close();
    }
} finally {
    await browser.close();
}
// The still drops to 256 colours when ffmpeg is on the path, about half the bytes.
for (const theme of ['light', 'dark']) {
    const file = resolve(out, `showcase-${theme}.png`);
    if (spawnSync('ffmpeg', ['-loglevel', 'error', '-y', '-i', file, '-vf', 'split[a][b];[a]palettegen=max_colors=256:stats_mode=full[p];[b][p]paletteuse=dither=sierra2_4a', '-pix_fmt', 'pal8', `${file}.tmp.png`]).status === 0) {
        spawnSync('mv', [`${file}.tmp.png`, file]);
    }
    sizes.push(`showcase-${theme}.png ${Math.round((await stat(file)).size / 1024)} KB`);
}
console.log(sizes.join('\n'));
