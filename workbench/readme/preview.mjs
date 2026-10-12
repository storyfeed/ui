// Local approval page and 2× loop proof. First build the old generator into
// build/readme/before, then the candidate into build/readme/preview with
// STORYFEED_README_OUT. Run: node workbench/readme/preview.mjs
import { chromium } from 'playwright';
import { readFile, writeFile, copyFile, mkdir, stat } from 'node:fs/promises';
import { resolve } from 'node:path';

const out = resolve('build/readme/preview');
const before = resolve(process.env.STORYFEED_README_BEFORE ?? 'build/readme/before');
const art = resolve(process.env.STORYFEED_CORE_ART ?? '../storyfeed/art');
await mkdir(out, { recursive: true });
for (const theme of ['light', 'dark']) await copyFile(resolve(art, `storyfeed-header-${theme}.svg`), resolve(out, `storyfeed-header-${theme}.svg`));
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 832, height: 588 }, deviceScaleFactor: 2 });
const freeze = (svg, time) => svg.replace(']]></style>', `#stage,#stage *{animation-play-state:paused!important;animation-delay:-${time}s!important}]]></style>`);
const src = svg => `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
const proof = {};
try {
    for (const theme of ['light', 'dark']) {
        proof[theme] = {};
        const background = theme === 'dark' ? '#0d1117' : '#ffffff';
        for (const version of ['before', 'after']) {
            const svg = await readFile(resolve(version === 'before' ? before : out, `showcase-${theme}.svg`), 'utf8');
            const windowed = svg.includes('width="832"');
            const loopSeconds = +svg.match(/animation:a\d+ ([\d.]+)s/)[1];
            const endSeconds = +(loopSeconds - 0.02).toFixed(2);
            if (version === 'after' && loopSeconds !== 15.7) throw new Error(`Expected the revised 15.7 s loop, got ${loopSeconds}`);
            if (version === 'before') {
                // Control experiment: exact inverse camera coordinates still
                // shift the painted row; eliminating the nested scales does not.
                await page.setContent(`<body style="margin:0">${svg}</body>`);
                const dots = await page.evaluate(() => {
                    const picture = document.querySelector('.nextpic');
                    const inner = document.querySelector('.inner2');
                    return { x: parseFloat(picture.style.left), y: parseFloat(picture.style.top), k: 1 / parseFloat(inner.style.transform.match(/scale\(([^)]+)/)[1]) };
                });
                for (const [label, correction] of [
                    ['exact-camera', `.camera{transform:translate(${-dots.x * dots.k}px,${-dots.y * dots.k}px) scale(${dots.k})!important}`],
                    ['native-camera', '.camera{transform:none!important}.nextpic{left:0!important;top:0!important}.inner2{transform:none!important}'],
                ]) {
                    const control = freeze(svg, endSeconds).replace(']]></style>', `${correction}]]></style>`);
                    await page.setContent(`<body style="margin:0;background:${background}"><img src="${src(control)}"></body>`);
                    await page.locator('img').evaluate(image => image.decode());
                    await page.screenshot({ path: resolve(out, `${theme}-${label}.png`), clip: { x: 16, y: 42, width: 800, height: 520 } });
                }
                proof[theme].control = { exactDotsCamera: dots };
            }
            for (const [label, time] of [['end', endSeconds], ['start', 0]]) {
                await page.setContent(`<body style="margin:0;background:${background}"><img src="${src(freeze(svg, time))}"></body>`);
                await page.locator('img').evaluate(image => image.decode());
                // Remove only the old window chrome for like-sized feed comparisons.
                await page.screenshot({ path: resolve(out, `${version}-${theme}-${label}.png`), clip: { x: windowed ? 16 : 0, y: windowed ? 42 : 0, width: 800, height: 520 } });
            }
            const urls = await Promise.all(['end', 'start'].map(async label => `data:image/png;base64,${(await readFile(resolve(out, `${version}-${theme}-${label}.png`))).toString('base64')}`));
            const diff = await page.evaluate(async urls => {
                const images = await Promise.all(urls.map(url => new Promise(resolve => { const image = new Image(); image.onload = () => resolve(image); image.src = url; })));
                const canvas = document.createElement('canvas'); canvas.width = 1600; canvas.height = 1040;
                const context = canvas.getContext('2d');
                const data = images.map(image => { context.clearRect(0, 0, 1600, 1040); context.drawImage(image, 0, 0); return context.getImageData(0, 0, 1600, 1040); });
                const result = context.createImageData(1600, 1040); let changed = 0, closeupChanged = 0;
                for (let n = 0; n < result.data.length; n += 4) {
                    const different = [0, 1, 2, 3].some(c => data[0].data[n + c] !== data[1].data[n + c]);
                    if (different) { changed++; if (n / 4 < 1600 * 260) closeupChanged++; }
                    result.data.set(different ? [215, 30, 100, 255] : [242, 244, 247, 255], n);
                }
                context.putImageData(result, 0, 0); const full = canvas.toDataURL('image/png');
                const crops = [...images, canvas].map(image => {
                    const crop = document.createElement('canvas'); crop.width = 800; crop.height = 260;
                    crop.getContext('2d').drawImage(image, 0, 0, 800, 260, 0, 0, 800, 260);
                    return crop.toDataURL('image/png');
                });
                return { changed, closeupChanged, full, crops };
            }, urls);
            await writeFile(resolve(out, `${version}-${theme}-diff.png`), Buffer.from(diff.full.split(',')[1], 'base64'));
            for (const [n, label] of ['end', 'start', 'diff'].entries()) await writeFile(resolve(out, `${version}-${theme}-${label}-closeup.png`), Buffer.from(diff.crops[n].split(',')[1], 'base64'));
            proof[theme][version] = { loopSeconds, endSeconds, changedPixels: diff.changed, closeupChangedPixels: diff.closeupChanged };
            if (version === 'after' && diff.changed !== 0) throw new Error(`${theme}: loop endpoints differ in ${diff.changed} pixels`);
        }
        // A pulled-back frame proves the outer mask and theme blending as an <img>.
        const candidate = await readFile(resolve(out, `showcase-${theme}.svg`), 'utf8');
        await writeFile(resolve(out, `pulled-${theme}.svg`), freeze(candidate, 12));
        await writeFile(resolve(out, `precut-${theme}.svg`), freeze(candidate, 15.678));
        await writeFile(resolve(out, `postcut-${theme}.svg`), freeze(candidate, 15.68));
        const png = await readFile(resolve(out, `showcase-${theme}.png`));
        proof[theme].still = await page.evaluate(async url => {
            const image = new Image(); image.src = url; await image.decode();
            const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height;
            const ctx = canvas.getContext('2d'); ctx.drawImage(image, 0, 0);
            const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
            const alpha = [...new Set(Array.from({ length: pixels.length / 4 }, (_, n) => pixels[n * 4 + 3]))].sort((a, b) => a - b);
            return { width: image.width, height: image.height, alphaLevels: alpha.length, minAlpha: alpha[0], maxAlpha: alpha.at(-1) };
        }, `data:image/png;base64,${png.toString('base64')}`);
        if (proof[theme].still.minAlpha !== 0 || proof[theme].still.alphaLevels < 3) throw new Error(`${theme}: still lost partial transparency`);
        proof[theme].sizes = Object.fromEntries(await Promise.all(['svg', 'png'].map(async extension => [extension, (await stat(resolve(out, `showcase-${theme}.${extension}`))).size])));
    }
} finally { await browser.close(); }
await writeFile(resolve(out, 'proof.json'), `${JSON.stringify(proof, null, 2)}\n`);
const hosts = [
    ['GitHub light', 'light', 'light'], ['GitHub dark', 'dark', 'dark'], ['Packagist', 'light', 'packagist'],
];
const host = ([name, theme, className]) => `<section class="host ${className}"><h2>${name}</h2><img class="header" src="storyfeed-header-${theme}.svg" width="328" height="80" alt="Storyfeed"><h3>Animation · 15.7 seconds</h3><img class="showcase" src="showcase-${theme}.svg" width="800" height="520" alt="Animated feed showcase"><h3>Reduced-motion PNG · transparent palette</h3><img class="showcase" src="showcase-${theme}.png" width="800" height="520" alt="Feed showcase still"><h3>Pulled back · outer fade to transparency</h3><img class="showcase" src="pulled-${theme}.svg" width="800" height="520" alt="Feed of README looks at 12 seconds"></section>`;
const loop = (version, theme) => `<section class="loop ${theme}"><h3>${version} · ${theme}</h3><p>Full 2× captures: <a href="${version}-${theme}-end.png">${proof[theme][version].endSeconds} s</a> / <a href="${version}-${theme}-start.png">0 s</a> / <a href="${version}-${theme}-diff.png">diff</a>. Changed pixels: ${proof[theme][version].changedPixels.toLocaleString()} (${proof[theme][version].closeupChangedPixels.toLocaleString()} in the top 130 CSS px).</p><div class="compare">${[['end', `${proof[theme][version].endSeconds} s`], ['start', '0 s'], ['diff', 'Difference · pink pixels changed']].map(([label, caption]) => `<figure><figcaption>${caption}</figcaption><img src="${version}-${theme}-${label}-closeup.png" width="800" height="260" alt="${caption}, ${version}, ${theme}, 2× close-up"></figure>`).join('')}</div></section>`;
await writeFile(resolve(out, 'index.html'), `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Storyfeed · unframed showcase approval</title><style>
*{box-sizing:border-box}body{margin:0;background:#e8ecf1;color:#18202b;font:16px/1.5 system-ui,sans-serif}main{padding:24px}h1,h2,h3{line-height:1.2}a{color:inherit}.hosts{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:20px}.host{padding:24px;overflow:hidden}.light{background:#ffffff;color:#18202b}.dark{background:#0d1117;color:#e6edf3}.packagist{background:#fafafa;color:#18202b}.packagist img{background:#ffffff}.header{display:block;max-width:100%;height:auto}.showcase{display:block;width:100%;max-width:800px;height:auto}.loop{padding:20px;margin-top:20px}.compare{display:flex;gap:20px;overflow:auto}figure{margin:0;flex:0 0 800px}figcaption{margin-bottom:8px}.compare img{display:block;width:800px;height:260px}.compare .showcase{height:520px}.note{max-width:1100px}@media(max-width:1200px){.hosts{grid-template-columns:1fr}.host{max-width:848px}}
</style><main><h1>Storyfeed · unframe + loop</h1><p class="note">No outer window. GitHub backgrounds: #ffffff and #0d1117. Packagist page: #fafafa with white image backgrounds. Pictures retain their own backgrounds; the outer feed fades to transparent.</p><p class="note">Cause: the dots picture’s 17.54× camera and inverse picture scale snap descendants differently from the opening picture’s 2.5× pair, visibly shifting the repeated row about 5 CSS px, even with exact camera coordinates. Choice: stay on the typing dots through the dive, then cut to the actual opening picture at 15.679 s, holding it across the 15.7 s loop. The repeated row inside the dots is removed. The typing hold is now 3.0 s; the other beats and content stay unchanged.</p><p class="note">Beats: pullback 9.1–10.3 s; your look 9.7 s; next look 11.2 s; typing hold 11.2–14.2 s (3.0 s); dive 14.2–15.7 s (1.5 s), with the opening cut at 15.679 s. The two look beats remain 1.5 s apart. Baseline: 16.1 s; candidate: 15.7 s.</p><div class="hosts">${hosts.map(host).join('')}</div><h2>The cut</h2><p>The last dots frame at 15.678 s, then the actual opening picture at 15.68 s. This is a scene cut rather than a stitch between two renderings of the same row.</p><section class="loop light"><div class="compare"><figure><figcaption>15.678 s · dive into typing dots</figcaption><img class="showcase" src="precut-light.svg" width="800" height="520" alt="Typing dots just before the cut"></figure><figure><figcaption>15.68 s · opening picture</figcaption><img class="showcase" src="postcut-light.svg" width="800" height="520" alt="Opening picture after the cut"></figure></div></section><h2>Loop proof · 2× pixels, no resizing of close-ups</h2><p>Both endpoints are frozen SVGs drawn as images at the same 800 px feed width. Old window chrome is cropped away. Full captures are 1600×1040; close-ups show the first 400×130 CSS px at 2×. Diff counts include every RGBA difference; pink marks changed pixels. <a href="proof.json">Measurements and exact asset sizes</a>. Controls: <a href="light-exact-camera.png">exact camera, still shifted</a> / <a href="light-native-camera.png">native scale, aligned</a>.</p>${['light', 'dark'].map(theme => ['before', 'after'].map(version => loop(version, theme)).join('')).join('')}</main></html>`);
console.log(JSON.stringify(proof, null, 2));
console.log(`Preview: ${resolve(out, 'index.html')}`);
