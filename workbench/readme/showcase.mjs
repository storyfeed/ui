// Builds the core README's showcase from the Blade kit's real output.
//
// ReadmeTest.php records a small made-up world through core and writes each
// scene's feed markup to build/readme/scenes.json. This script lays each scene
// out with its caption and code, styles it with the kit's own Tailwind
// classes, re-serializes it as XHTML in Chromium, and wraps the scenes in one
// SVG per theme whose CSS cycles through them. No script runs in the SVG: it
// is markup, a stylesheet and keyframes, which GitHub draws as an image.
//
// It also saves PNG stills: the showcase's last scene (the reduced-motion
// fallback, and what Packagist shows), a small feed on its own, and the
// recording call beside the row it produces.
//
//   npm run readme:showcase    writes to STORYFEED_README_OUT (default ../storyfeed/art/samples)
import { chromium } from 'playwright';
import { readFile, writeFile, mkdir, stat } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import { spawnSync } from 'node:child_process';

const out = resolve(process.env.STORYFEED_README_OUT ?? '../storyfeed/art/samples');
const feeds = JSON.parse(await readFile('build/readme/scenes.json', 'utf8'));
const css = await readFile('build/readme/readme.css', 'utf8');
await mkdir(out, { recursive: true });

const WIDTH = 800;
const SCENE = 4.6; // seconds each scene holds
const FADE = 0.45;

// Code is highlighted by a few rules, enough for short PHP and markup.
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const highlight = code => esc(code)
    .replace(/'([^']*)'/g, '<span style="color:var(--code-string)">\'$1\'</span>')
    .replace(/(\$[a-z]+)/gi, '<span style="color:var(--code-var)">$1</span>')
    .replace(/\b(Storyfeed|Story|Group|KeyValue)::/g, '<span style="color:var(--code-key)">$1</span>::')
    .replace(/(&lt;\/?)(x-storyfeed::feed|FeedStream)/g, '$1<span style="color:var(--code-key)">$2</span>');

const SCENES = [
    { title: 'Record what happens in your app', code: ["Storyfeed::activity('confirm', $booking)->by($mira)->target($fair)->publish();"], layers: ['empty', 'record'] },
    { title: 'Read it back as a feed; related activity groups itself', code: ["Story::verb('upload')->grouped(\n    Group::byActorsOnTarget()->headline(':actors uploaded :count photos to :target'),\n);", 'Storyfeed::feed()->live()->get();'], layers: ['grouped'] },
    { title: 'Rows carry bodies: photos, key-value cards, prose, files', code: ["KeyValue::make(['Stall' => 'Soft pretzels', 'Pitch' => 'B4', 'Fee' => '$120, paid']);"], layers: ['bodies'] },
    { title: 'Scope a feed to anyone or anything involved', code: ['Storyfeed::feed()->involving($sam)->get();'], layers: ['scoped'] },
    { title: 'New activity joins its group as it arrives', code: ["Storyfeed::activity('upload', $photo)->by($ines)->target($fair)->publish();"], layers: ['grouped', 'live'] },
    { title: 'Render the same feed with Blade, Vue or React', code: ['<x-storyfeed::feed :page="$feed" />', '<FeedStream :items="feed.data" />', '<FeedStream items={feed.data} />'], kits: true, layers: ['live'] },
];
const LOOP = SCENES.length * SCENE;
const LAST = SCENES.length - 1;
const pct = seconds => `${+(100 * Math.min(Math.max(seconds, 0), LOOP) / LOOP).toFixed(3)}%`;

const codeBlock = (lines, kits = false) => `<div class="rounded-lg bg-(--code) px-4 py-3 font-mono text-[12.5px] leading-[1.7] text-foreground">${lines.map((line, i) => `<div class="${kits ? `kit k${i} ` : ''}whitespace-pre-wrap">${kits ? `<span class="inline-block w-12 text-muted-foreground">${['Blade', 'Vue', 'React'][i]}</span>` : ''}${highlight(line)}</div>`).join('')}</div>`;
const sceneHtml = (scene, index) => `<div class="scene s${index} absolute inset-x-0 top-0 px-6 pt-5">
    <div class="flex items-baseline gap-3 text-[13px] text-muted-foreground"><span class="font-mono tabular-nums">${index + 1}/${SCENES.length}</span><span class="text-[15px] font-semibold text-foreground">${esc(scene.title)}</span></div>
    <div class="mt-3">${codeBlock(scene.code, scene.kits)}</div>
    <div class="relative mt-4">${scene.layers.map((layer, i) => `<div class="layer l${i}${i ? ' absolute inset-x-0 top-0' : ''}">${feeds[layer]}</div>`).join('')}</div>
</div>`;

// The timeline: each scene fades in for its slot; a two-layer scene swaps
// its layers 40% in, the new state settling from just above.
const show = (name, start, end) => `@keyframes ${name}{0%,${pct(start - FADE / 2)}{opacity:0}${pct(start + FADE / 2)},${pct(end - FADE / 2)}{opacity:1}${pct(end + FADE / 2)},100%{opacity:0}}`;
const timeline = SCENES.map((scene, i) => {
    const start = i * SCENE, end = start + SCENE;
    // The first scene wraps around: it is showing at 0s and fades back in at the loop's end.
    const rules = [`.s${i}{opacity:0;animation:s${i} ${LOOP}s infinite}`, i === 0
        ? `@keyframes s0{0%,${pct(end - FADE / 2)}{opacity:1}${pct(end + FADE / 2)},${pct(LOOP - FADE / 2)}{opacity:0}100%{opacity:1}}`
        : show(`s${i}`, start, end)];
    if (scene.layers.length > 1) {
        const swap = start + SCENE * 0.4;
        rules.push(`.s${i} .l0{animation:s${i}a ${LOOP}s infinite}.s${i} .l1{opacity:0;animation:s${i}b ${LOOP}s infinite}`,
            `@keyframes s${i}a{0%,${pct(swap - 0.2)}{opacity:1}${pct(swap + 0.1)},100%{opacity:0}}`,
            `@keyframes s${i}b{0%,${pct(swap - 0.1)}{opacity:0;transform:translateY(-6px)}${pct(swap + 0.35)},100%{opacity:1;transform:none}}`);
    }
    if (scene.kits) {
        const third = SCENE / 3;
        scene.code.forEach((_, k) => rules.push(`.k${k}{opacity:.35;animation:k${k} ${LOOP}s infinite}`,
            `@keyframes k${k}{0%,${pct(start + k * third - 0.15)}{opacity:.35}${pct(start + k * third + 0.15)},${pct(start + (k + 1) * third - 0.15)}{opacity:1}${pct(start + (k + 1) * third + 0.15)},100%{opacity:.35}}`));
    }
    return rules.join('');
}).join('');
// Reduced motion, where the viewer passes it through: the last scene, still.
const still = `@media (prefers-reduced-motion:reduce){.scene,.layer,.kit{animation:none!important;transform:none!important}.scene{opacity:0}.s${LAST},.s${LAST} .layer,.kit{opacity:1}}`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: WIDTH, height: 900 }, deviceScaleFactor: 2 });
await page.route('http://readme.test/**', async route => {
    const path = new URL(route.request().url()).pathname.slice(1);
    const file = path === 'media/fireworks.jpg' ? 'workbench/readme/media/fireworks.jpg' : path.startsWith('media/') ? `workbench/${path}` : `build/readme/${path}`;
    await route.fulfill({ body: await readFile(file), contentType: { '.css': 'text/css', '.jpg': 'image/jpeg', '.html': 'text/html' }[extname(file)] });
});

// Loads markup into the styled page, drops what a closed group never draws,
// and swaps every image for WebP at twice its drawn size.
const load = async (theme, html) => {
    await writeFile('build/readme/page.html', `<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="readme.css"></head><body style="margin:0"><div id="stage" class="${theme} relative overflow-hidden bg-background text-foreground font-sans text-[16px] leading-normal antialiased" style="width:${WIDTH}px">${html}</div></body></html>`);
    await page.goto('http://readme.test/page.html');
    await page.evaluate(async () => {
        await document.fonts.ready;
        document.querySelectorAll('details:not([open])').forEach(details => [...details.children].forEach(child => child.tagName === 'SUMMARY' || child.remove()));
        for (const image of document.images) image.loading = 'eager';
        await Promise.all([...document.images].map(image => image.decode().catch(() => {})));
        const encoded = new Map();
        for (const image of document.images) {
            const src = image.getAttribute('src');
            if (!encoded.has(src)) {
                const box = image.getBoundingClientRect();
                const canvas = document.createElement('canvas');
                canvas.width = Math.round(box.width * 2); canvas.height = Math.round(box.height * 2);
                const scale = Math.max(canvas.width / image.naturalWidth, canvas.height / image.naturalHeight);
                canvas.getContext('2d').drawImage(image, (canvas.width - image.naturalWidth * scale) / 2, (canvas.height - image.naturalHeight * scale) / 2, image.naturalWidth * scale, image.naturalHeight * scale);
                encoded.set(src, canvas.toDataURL('image/webp', 0.6));
            }
            image.setAttribute('src', encoded.get(src));
            image.removeAttribute('srcset');
        }
    });
};
const stage = () => page.locator('#stage');
const sizes = [];

try {
    for (const theme of ['light', 'dark']) {
        await load(theme, SCENES.map(sceneHtml).join(''));
        // The SVG is as tall as its tallest scene, counting a scene's layers as one.
        const height = await page.evaluate(() => Math.ceil(Math.max(...[...document.querySelectorAll('.scene')].map(scene => {
            const layers = [...scene.querySelectorAll('.layer')];
            const top = scene.getBoundingClientRect().top;
            return Math.max(...layers.map(layer => layer.getBoundingClientRect().bottom)) - top;
        })) + 20));
        const xhtml = await page.evaluate(() => new XMLSerializer().serializeToString(document.getElementById('stage')));
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${height}" viewBox="0 0 ${WIDTH} ${height}" role="img" aria-label="Storyfeed in six scenes: recording an activity, reading it back grouped, rows with photo and key-value bodies, a feed scoped to one person, a new activity joining its group, and one feed rendered by the Blade, Vue and React kits."><style><![CDATA[${css}#stage{height:${height}px}${timeline}${still}]]></style><foreignObject width="${WIDTH}" height="${height}">${xhtml}</foreignObject></svg>`;
        await writeFile(resolve(out, `showcase-${theme}.svg`), svg);
        sizes.push(`showcase-${theme}.svg ${WIDTH}×${height} ${Math.round(svg.length / 1024)} KB`);

        // The reduced-motion still: the last scene as the SVG draws it.
        await page.evaluate(([last, height]) => {
            document.getElementById('stage').style.height = `${height}px`;
            document.querySelectorAll('.scene').forEach((scene, i) => { scene.style.opacity = i === last ? '1' : '0'; });
        }, [LAST, height]);
        await stage().screenshot({ path: resolve(out, `showcase-${theme}.png`) });

        // Option A: a small feed, on its own.
        await load(theme, `<div class="px-6 py-5">${feeds.poster}</div>`);
        await stage().screenshot({ path: resolve(out, `feed-${theme}.png`) });

        // Option C: the recording call, and the row it produces.
        await load(theme, `<div class="grid grid-cols-[1fr_auto_1.1fr] items-center gap-4 px-6 py-5">${codeBlock(["Storyfeed::activity('confirm', $booking)\n    ->by($mira)\n    ->target($fair)\n    ->publish();"])}<span class="text-xl text-muted-foreground">→</span><div>${feeds.record}</div></div>`);
        await stage().screenshot({ path: resolve(out, `record-${theme}.png`) });
    }
} finally {
    await browser.close();
}
// Stills drop to 256 colours when ffmpeg is on the path, about half the bytes.
const quantize = file => spawnSync('ffmpeg', ['-loglevel', 'error', '-y', '-i', file, '-vf', 'split[a][b];[a]palettegen=max_colors=256:stats_mode=full[p];[b][p]paletteuse=dither=sierra2_4a', '-pix_fmt', 'pal8', `${file}.tmp.png`]).status === 0
    && spawnSync('mv', [`${file}.tmp.png`, file]).status === 0;
for (const option of ['showcase', 'feed', 'record']) {
    for (const theme of ['light', 'dark']) quantize(resolve(out, `${option}-${theme}.png`));
    for (const theme of ['light', 'dark']) sizes.push(`${option}-${theme}.png ${Math.round((await stat(resolve(out, `${option}-${theme}.png`))).size / 1024)} KB`);
}
console.log(sizes.join('\n'));
