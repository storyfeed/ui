// Rendered audit at 0.02 s steps, including the loop boundary. Inputs are the
// windowed original, the first unframed candidate, and the fixed candidate.
import { chromium } from 'playwright';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const out = resolve('build/readme/preview');
const versions = { original: 'build/readme/before', before: 'build/readme/round2-before', after: out };
const browser = await chromium.launch();
const report = { stepSeconds: 0.02, opacityThreshold: 0.05, versions: {} };
const ranges = hits => {
    const grouped = new Map();
    for (const hit of hits) {
        const key = hit.pair.join(' / ');
        const list = grouped.get(key) ?? [];
        const last = list.at(-1);
        if (last && Math.abs(last.end + 0.02 - hit.time) < 0.0001) last.end = hit.time;
        else list.push({ start: hit.time, end: hit.time });
        grouped.set(key, list);
    }
    return [...grouped].map(([pair, intervals]) => ({ pair, intervals }));
};
try {
    for (const [version, directory] of Object.entries(versions)) {
        report.versions[version] = {};
        for (const theme of ['light', 'dark']) {
            const page = await browser.newPage({ viewport: { width: 850, height: 620 }, deviceScaleFactor: 2 });
            const svg = await readFile(resolve(directory, `showcase-${theme}.svg`), 'utf8');
            await page.setContent(`<body style="margin:0">${svg}</body>`);
            const samples = await page.evaluate(async () => {
                await document.fonts.ready;
                await Promise.all([...document.images].map(image => image.decode().catch(() => {})));
                const animations = document.getAnimations();
                await Promise.all(animations.map(async animation => { animation.pause(); await animation.ready; }));
                const loop = animations.find(animation => animation.effect.target.matches('.L-plain')).effect.getTiming().duration;
                const layers = [...document.querySelectorAll('.layer')];
                const layerName = layer => [...layer.classList].find(name => name.startsWith('L-'));
                const rows = parent => [...parent.querySelector('[role=feed]').children].filter(child => child.tagName === 'ARTICLE');
                const opacity = element => {
                    let value = 1;
                    for (let parent = element; parent; parent = parent.parentElement) value *= +getComputedStyle(parent).opacity;
                    return value;
                };
                const clip = element => {
                    const box = element.getBoundingClientRect();
                    const result = { left: box.left, top: box.top, right: box.right, bottom: box.bottom };
                    for (let parent = element.parentElement; parent; parent = parent.parentElement) {
                        const css = getComputedStyle(parent);
                        if (['hidden', 'clip', 'scroll', 'auto'].includes(css.overflowX) || ['hidden', 'clip', 'scroll', 'auto'].includes(css.overflowY)) {
                            const bounds = parent.getBoundingClientRect();
                            result.left = Math.max(result.left, bounds.left); result.top = Math.max(result.top, bounds.top);
                            result.right = Math.min(result.right, bounds.right); result.bottom = Math.min(result.bottom, bounds.bottom);
                        }
                    }
                    return result;
                };
                const visible = box => box.right > box.left && box.bottom > box.top;
                const intersects = (a, b) => Math.min(a.right, b.right) > Math.max(a.left, b.left) && Math.min(a.bottom, b.bottom) > Math.max(a.top, b.top);
                const layerHits = [], headlineHits = [];
                let maxLayersWithRows = 0;
                const outer = document.querySelector('.outer');
                for (let tick = 0; tick <= Math.round(loop / 20); tick++) {
                    const time = +(tick * 0.02).toFixed(2);
                    animations.forEach(animation => { animation.currentTime = tick * 20; });
                    const active = layers.map(layer => ({ name: layerName(layer), rows: rows(layer).filter(row => opacity(row) > 0.05).map(clip).filter(visible) })).filter(layer => layer.rows.length);
                    maxLayersWithRows = Math.max(maxLayersWithRows, active.length);
                    for (let i = 0; i < active.length; i++) for (let j = i + 1; j < active.length; j++) {
                        if (active[i].rows.some(a => active[j].rows.some(b => intersects(a, b)))) layerHits.push({ time, pair: [active[i].name, active[j].name] });
                    }
                    // Also audit readable headline rectangles inside a state,
                    // including the joins fold and outer You/next-look rows.
                    // A picture nested in an outer row is an intentional region
                    // overlap; its outer headline is checked separately.
                    const headlines = [...layers, outer].flatMap(parent => rows(parent).flatMap((row, index) => {
                        const headline = row.querySelector('time')?.closest('div')?.previousElementSibling;
                        if (!headline || opacity(headline) <= 0.05) return [];
                        const box = clip(headline);
                        return visible(box) ? [{ name: `${parent === outer ? 'outer' : layerName(parent)}:R${index}`, box }] : [];
                    }));
                    for (let i = 0; i < headlines.length; i++) for (let j = i + 1; j < headlines.length; j++) {
                        if (intersects(headlines[i].box, headlines[j].box)) headlineHits.push({ time, pair: [headlines[i].name, headlines[j].name] });
                    }
                }
                return { loopSeconds: loop / 1000, sampleCount: Math.round(loop / 20) + 1, maxLayersWithRows, layerHits, headlineHits };
            });
            report.versions[version][theme] = {
                ...samples,
                layerOverlapRanges: ranges(samples.layerHits),
                headlineOverlapRanges: ranges(samples.headlineHits),
            };
            console.log(`${version}/${theme}: ${samples.sampleCount} samples, ${samples.layerHits.length} layer overlaps, ${samples.headlineHits.length} headline overlaps`);
            await page.close();
        }
    }
} finally { await browser.close(); }
await writeFile(resolve(out, 'layer-sweep.json'), `${JSON.stringify(report, null, 2)}\n`);
for (const theme of ['light', 'dark']) {
    const after = report.versions.after[theme];
    if (after.layerHits.length || after.headlineHits.length) throw new Error(`${theme}: remaining overlaps; see layer-sweep.json`);
}
