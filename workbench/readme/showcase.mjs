// Builds the core README's showcase from the Blade kit's real output.
//
// ReadmeTest.php records a small made-up world through core and writes each
// state of the arc as Blade markup (build/readme/states.json). This script
// stacks the states as layers in one page, styles them with the Tailwind
// classes they use, measures their rows, and writes one SVG per theme whose
// CSS keyframes play the arc: rows gain their people and bodies, a run of rows
// collapses into a group, photos arrive and regroup, the feed narrows to one
// person, then opens out to the whole feed, takes one more arrival, holds,
// and dissolves back into the opening row. No script runs in the SVG; GitHub
// draws it as an image.
//
// It also writes a PNG still of the richest frame, for reduced motion.
//
//   npm run readme:showcase    writes to STORYFEED_README_OUT (default ../storyfeed/art/samples)
import { chromium } from 'playwright';
import { readFile, writeFile, mkdir, stat } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import { spawnSync } from 'node:child_process';

const out = resolve(process.env.STORYFEED_README_OUT ?? '../storyfeed/art/samples');
const states = JSON.parse(await readFile('build/readme/states.json', 'utf8'));
const css = await readFile('build/readme/readme.css', 'utf8');
await mkdir(out, { recursive: true });

const WIDTH = 800;
const HEIGHT = 520;
// One transition system for every beat: a single easing curve, three
// durations, and one stagger between rows.
const EASE = 'cubic-bezier(.3,0,.2,1)';
const ENTER = 0.3; // something appears: a row, a group, a state
const MOVE = 0.4; // rows slide or a state regroups
const EXIT = 0.5; // a scene dissolves into the next
const STAGGER = 0.4; // between rows arriving one after another

// The arc, in seconds. Each beat builds on the one before. The live photos
// come faster and faster (each gap 0.8 of the last), as mod's tree does, and
// the richest state holds longest before the loop dissolves back to its start.
const T = { rich: 1.6, joins: 4.0, collapse: 6.4, photos: 7.6, scoped: 11.8, richest: 13.4, arrival: 14.3, dissolve: 16.8 };
T.richRows = [0, 1].map(k => T.rich + MOVE + k * STAGGER);
T.joinArrivals = [0, 1, 2, 3, 4].map(k => T.joins + k * STAGGER);
T.photoArrivals = [0, 1, 2, 3, 4].map(k => T.photos + [0, 1, 1.8, 2.44, 2.952][k]);
const LOOP = +(T.dissolve + EXIT + 0.2).toFixed(2);

const ORDER = ['plain', 'rich', 'joins', 'joined', 'photos1', 'photos2', 'photos3', 'photos4', 'photos5', 'scoped', 'richest', 'payoff'];
const feed = (html, extra = '') => `<div class="px-6 pt-4">${extra}${html}</div>`;
const caption = text => `<div class="absolute right-6 top-4 rounded-full bg-muted px-3 py-1 text-[13px] text-muted-foreground">${text}</div>`;
const LAYERS = {
    ...Object.fromEntries(ORDER.filter(key => states[key]).map(key => [key, feed(states[key])])),
    scoped: feed(states.scoped, caption('Sam Ortega’s feed')),
};

// Keyframes from [seconds, declarations] pairs, eased between them.
let names = 0;
const pct = seconds => `${+(100 * seconds / LOOP).toFixed(3)}%`;
const animate = (selector, frames) => {
    const name = `a${names++}`;
    const sorted = [...frames].sort((a, b) => a[0] - b[0]);
    const all = [[0, sorted[0][1]], ...sorted, [LOOP, sorted.at(-1)[1]]];
    return `${selector}{animation:${name} ${LOOP}s ${EASE} infinite}@keyframes ${name}{${all.map(([t, d]) => `${pct(t)}{${d}}`).join('')}}`;
};

// Builds every rule once the rows are measured: tops[layer] lists each row's
// offset from the top of its layer.
const timeline = tops => {
    const from = (key, i) => +(tops[key][i] - tops[key][0]).toFixed(2);
    const rules = [];
    const layer = key => `.L-${key}`;
    const row = (key, i) => `${layer(key)} .R${i}`;
    const at = (key, frames) => rules.push(animate(key, frames));

    // Which state shows when: each takes over from the one before across
    // the window given (0 where the two draw the same rows, a straight swap).
    const sequence = [
        ['plain', 0, 0],
        ['rich', T.rich, MOVE],
        ['joins', T.joins, 0],
        ['joined', T.collapse + MOVE, ENTER],
        ...T.photoArrivals.map((time, n) => [`photos${n + 1}`, time, n < 2 ? 0 : MOVE]),
        ['scoped', T.scoped, EXIT],
        ['richest', T.richest, EXIT],
        ['payoff', T.arrival, 0],
        ['plain', T.dissolve, EXIT],
    ];
    const visibility = {};
    sequence.forEach(([key, time, window], n) => {
        const span = window || 0.01;
        (visibility[key] ??= []).push(...(time === 0 ? [[0, 'opacity:1']] : [[time, 'opacity:0'], [time + span, 'opacity:1']]));
        if (n) (visibility[sequence[n - 1][0]] ??= []).push([time, 'opacity:1'], [time + span, 'opacity:0']);
    });
    Object.entries(visibility).forEach(([key, frames]) => at(layer(key), frames[0][0] === 0 ? frames : [[0, 'opacity:0'], ...frames]));

    // A row arrives on top: the rows under it move down to make room, and it
    // enters halfway through the move.
    const arrive = (time, i, isNew, from, to) => {
        if (!isNew) return [[time, from], [time + MOVE, to]];
        const place = to.replace(/opacity:[^;]*;?/, '');
        return [[time, `opacity:0;${place}`], [time + MOVE / 2, `opacity:0;${place}`], [time + MOVE / 2 + ENTER, `opacity:1;${place}`]];
    };

    // 2. The plain row gains its person; the rows under it enter one by one.
    T.richRows.forEach((time, n) => at(row('rich', n + 1), [[time, 'opacity:0;transform:translateY(-6px)'], [time + ENTER, 'opacity:1;transform:translateY(0px)']]));

    // 3. Joins arrive one by one, then fold: each slides up under the top
    // one, gone by half the move, while the rows below rise under the group.
    const joins = tops.joins.map((_, i) => from('joins', i));
    const lift = (first, i) => `opacity:${i >= first ? 1 : 0};transform:translateY(${-joins[first]}px)`;
    joins.forEach((_, i) => {
        const frames = [[T.joins, lift(5, i)]];
        T.joinArrivals.forEach((time, k) => frames.push(...arrive(time, i, i === 4 - k, lift(5 - k, i), lift(4 - k, i))));
        const fold = T.collapse;
        if (i === 0) frames.push([fold, lift(0, 0)]);
        else if (i <= 4) frames.push([fold, lift(0, i)], [fold + MOVE / 2, `opacity:0;transform:translateY(${-joins[i] / 2}px)`], [fold + MOVE, `opacity:0;transform:translateY(${-joins[i]}px)`]);
        else frames.push([fold, lift(0, i)], [fold + MOVE, `opacity:1;transform:translateY(${+((tops.joined[i - 4] ?? tops.joins[i]) - tops.joins[i]).toFixed(2)}px)`]);
        at(row('joins', i), frames);
    });

    // 4 and 6. The first two photos and the payoff's booking push in on top.
    const pushDown = (key, time) => tops[key].forEach((_, i) => at(row(key, i), arrive(time, i, i === 0, `transform:translateY(${-from(key, 1)}px)`, 'transform:translateY(0px)')));
    pushDown('photos1', T.photoArrivals[0]);
    pushDown('photos2', T.photoArrivals[1]);
    pushDown('payoff', T.arrival);
    return rules.join('');
};
// Reduced motion, where the viewer passes it through: the richest frame, still.
const still = '@media (prefers-reduced-motion:reduce){#stage *{animation:none!important}.layer{opacity:0}#stage .L-payoff{opacity:1}}';

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
                if (!feed) continue;
                const rows = [...feed.children].filter(child => child.tagName === 'ARTICLE');
                const top = layer.getBoundingClientRect().top;
                rows.forEach((row, i) => row.classList.add(`R${i}`));
                tops[key] = rows.map(row => +(row.getBoundingClientRect().top - top).toFixed(2));
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
                // Drawn through `content`, an <img> loses the size its attributes give it; keep the size the page drew.
                const drawn = image.getBoundingClientRect();
                Object.assign(image.style, { width: `${+drawn.width.toFixed(2)}px`, height: `${+drawn.height.toFixed(2)}px` });
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
        const keep = token => /^(layer|L-.+|R\d+|p\d+)$/.test(token);
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
            const names = [...element.classList].map(name => /^(layer|L-.+|R\d+|p\d+)$/.test(name) ? name : map[name]).filter(Boolean);
            names.length ? element.setAttribute('class', names.join(' ')) : element.removeAttribute('class');
        }), map);

        const xhtml = await page.evaluate(() => new XMLSerializer().serializeToString(document.getElementById('stage')));
        // The rows are measured again where they are drawn, inside the SVG,
        // where a group row can lay out a few pixels apart from the page.
        const build = tops => `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" role="img" aria-label="A Storyfeed feed growing: one plain row gains avatars, a photo and a key-value card; five volunteers joining fold into one grouped row; photos arrive live and regroup with a strip of thumbnails; the feed narrows to one person, then opens out to the whole feed as one more booking arrives."><style><![CDATA[${styled}${pictures}${timeline(tops)}${still}]]></style><foreignObject width="${WIDTH}" height="${HEIGHT}">${xhtml}</foreignObject></svg>`;
        const measure = await browser.newPage({ viewport: { width: WIDTH, height: HEIGHT } });
        await measure.setContent(`<body style="margin:0">${build(tops)}<style>#stage *{animation:none!important}</style></body>`);
        const drawn = await measure.evaluate(keys => Object.fromEntries(keys.map(key => {
            const layer = document.querySelector(`.L-${key}`);
            const top = layer.getBoundingClientRect().top;
            return [key, [...layer.querySelectorAll('[class~=R0],[class*=" R"],[class^="R"]')].filter(row => /(^| )R\d+( |$)/.test(row.getAttribute('class')))
                .sort((a, b) => +a.getAttribute('class').match(/R(\d+)/)[1] - +b.getAttribute('class').match(/R(\d+)/)[1])
                .map(row => +(row.getBoundingClientRect().top - top).toFixed(2))];
        })), Object.keys(tops));
        await measure.close();
        const svg = build({ ...tops, ...drawn });
        await writeFile(resolve(out, `showcase-${theme}.svg`), svg);
        sizes.push(`showcase-${theme}.svg ${WIDTH}×${HEIGHT} ${Math.round(svg.length / 1024)} KB`);

        // The reduced-motion still: the richest frame.
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
