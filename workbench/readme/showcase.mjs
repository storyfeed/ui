// Builds the core README's showcase from the Blade kit's real output.
//
// ReadmeTest.php records two worlds through core and renders them with the
// Blade kit: build/readme/states.json, the feed inside the picture, state by
// state; build/readme/looks.json, the feed of looks at Storyfeed's README
// that the camera pulls back to. This script stacks them in one page, styles
// them with the Tailwind classes they use, measures their rows where the SVG
// draws them, and writes one SVG per theme whose CSS keyframes play the arc:
//
//   the inner feed grows top-first (a plain row, its avatar, a key-value
//   card, a photo, three joins folding into a group, live photos arriving and
//   regrouping), the camera pulls back to show it is the picture in your look
//   at the README, the next person's look arrives above yours, typing, and
//   the camera dives into its dots, landing on the opening frame.
//
// No script runs in the SVG; GitHub draws it as an image. It also writes a
// PNG still of the closing frame for reduced motion.
//
//   npm run readme:showcase    writes to STORYFEED_README_OUT (default ../storyfeed/art/samples)
import { chromium } from 'playwright';
import { readFile, writeFile, mkdir, stat } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import { spawnSync } from 'node:child_process';

const out = resolve(process.env.STORYFEED_README_OUT ?? '../storyfeed/art/samples');
const states = JSON.parse(await readFile('build/readme/states.json', 'utf8'));
// The in-progress look shows the typing indicator everyone knows: three dots
// pulsing in turn in a small bubble, under its time. It is the showcase
// page's own markup and stylesheet on the kit's row; the kit ships none.
const TYPING = '.tdot{animation:tdot 1.2s cubic-bezier(.3,0,.2,1) infinite}.tdot:nth-child(2){animation-delay:.15s}.tdot:nth-child(3){animation-delay:.3s}@keyframes tdot{0%,60%,100%{opacity:.35;transform:translateY(0)}30%{opacity:1;transform:translateY(-3px)}}';
const css = (await readFile('build/readme/readme.css', 'utf8')) + TYPING;
const looks = JSON.parse(await readFile('build/readme/looks.json', 'utf8')).feed;
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

// The arc, in seconds. Each beat builds on the one before, and the live
// photos come faster and faster (each gap 0.8 of the last), as mod's tree does.
const ZOOM = 1.2; // the one longer move: the camera pulling back, and zooming in
// The lead-up shows each capability once: three joins make the fold, four photos the live run and its regroup.
const JOINS = 3;
const T = { avatar: 1.2, rich1: 2.0, rich2: 2.6, joins: 3.4, collapse: 5.0, photos: 6.1, pull: 9.1 };
// The ending keeps an even beat: one after your look lands, the next
// person's look arrives, typing; its dots linger for suspense; then the
// camera dives into them in one beat, landing on frame 0.
const BEAT = 1.5;
const DOTS = 3.4; // from the dots' beat to the dive: about 3.15 s of typing dots on screen
const DIVE = BEAT; // the third beat: the dive into the dots
T.you = T.pull + ZOOM / 2;
T.next = T.you + BEAT; // one beat after your look, the next person's look arrives, typing
T.resolve = T.next + DOTS; // the dots linger, for suspense, before the dive
T.zoomIn = T.resolve; // the camera dives into the typing dots
T.joinArrivals = [...Array(JOINS).keys()].map(k => T.joins + k * STAGGER);
T.photoArrivals = [0, 1, 2, 3].map(k => T.photos + [0, 0.9, 1.62, 2.196][k]);
const LOOP = +(T.zoomIn + DIVE).toFixed(2);

const ORDER = ['plain', 'avatar', 'rich1', 'rich2', 'joins', 'joined', 'photos1', 'photos2', 'photos3', 'finished'];
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
let CAM = { x: 0, y: 0, k: 1 };
let OUTER_ROWS = 0;
let OUTER_TOPS = [];
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
        ['avatar', T.avatar, MOVE],
        ['rich1', T.rich1, 0],
        ['rich2', T.rich2, 0],
        ['joins', T.joins, 0],
        ['joined', T.collapse + MOVE, ENTER],
        // The last photo's regroup is the finished frame.
        ...T.photoArrivals.map((time, n) => [n === 3 ? 'finished' : `photos${n + 1}`, time, n < 2 ? 0 : MOVE]),
        // Your picture keeps the feed as you left it; it returns to the opening
        // row only at the loop's seam, pushed far off screen by then.
        ['plain', LOOP - 0.02, 0],
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

    // The plain row gains its person.

    // 3. Joins arrive one by one, then fold: each slides up under the top
    // one, gone by half the move, while the rows below rise under the group.
    const joins = tops.joins.map((_, i) => from('joins', i));
    const lift = (first, i) => `opacity:${i >= first ? 1 : 0};transform:translateY(${-joins[first]}px)`;
    joins.forEach((_, i) => {
        const frames = [[T.joins, lift(JOINS, i)]];
        T.joinArrivals.forEach((time, k) => frames.push(...arrive(time, i, i === JOINS - 1 - k, lift(JOINS - k, i), lift(JOINS - 1 - k, i))));
        const fold = T.collapse;
        if (i === 0) frames.push([fold, lift(0, 0)]);
        else if (i < JOINS) frames.push([fold, lift(0, i)], [fold + MOVE / 2, `opacity:0;transform:translateY(${-joins[i] / 2}px)`], [fold + MOVE, `opacity:0;transform:translateY(${-joins[i]}px)`]);
        else frames.push([fold, lift(0, i)], [fold + MOVE, `opacity:1;transform:translateY(${+((tops.joined[i - JOINS + 1] ?? tops.joins[i]) - tops.joins[i]).toFixed(2)}px)`]);
        at(row('joins', i), frames);
    });

    // The first two photos push in on top.
    const pushDown = (key, time) => tops[key].forEach((_, i) => at(row(key, i), arrive(time, i, i === 0, `transform:translateY(${-from(key, 1)}px)`, 'transform:translateY(0px)')));
    pushDown('photos1', T.photoArrivals[0]);
    pushDown('photos2', T.photoArrivals[1]);
    pushDown('rich1', T.rich1);
    pushDown('rich2', T.rich2);
    // The mirror: the camera sits zoomed into the outer row's picture, pulls
    // back to show that the feed so far is that picture, then zooms back in.
    const zoomed = `transform:translate(${-CAM.x * CAM.k}px,${-CAM.y * CAM.k}px) scale(${CAM.k})`;
    // It ends zoomed into the next look's typing dots, where the same opening frame waits.
    const intoDots = `transform:translate(${-CAM.dots.x * CAM.dots.k}px,${-CAM.dots.y * CAM.dots.k}px) scale(${CAM.dots.k})`;
    at('.camera', [[0, zoomed], [T.pull, zoomed], [T.pull + ZOOM, 'transform:translate(0px,0px) scale(1)'], [T.zoomIn, 'transform:translate(0px,0px) scale(1)'], [T.zoomIn + DIVE, intoDots]]);
    // The feed of looks, top-first: past looks are already there, your look
    // holds the top slot as the camera pulls back, and the next person's look
    // arrives above it, pushing everything down.
    const o = OUTER_TOPS, h = i => o[i + 1] - o[i];
    const raise = first => `transform:translateY(${-(o[first] - o[0])}px)`;
    const outerRow = (i, frames) => at(`.outer .O${i}`, frames);
    const you = T.you;
    o.forEach((_, i) => {
        const shown = (first, place) => `opacity:${i >= first ? 1 : 0};${place}`;
        // Your look (row 1) holds the top slot as the camera pulls back from
        // its picture; the past looks are already under it.
        const frames = [[0, shown(2, raise(1))]];
        frames.push(...(i === 1 ? [[you, `opacity:0;${raise(1)}`], [you + ENTER, `opacity:1;${raise(1)}`]] : [[you, shown(2, raise(1))]]));
        // One beat later, the next person's look (row 0) arrives, still in progress.
        frames.push(...(i === 0 ? [[T.next, `opacity:0;${raise(0)}`], [T.next + MOVE / 2, `opacity:0;${raise(0)}`], [T.next + MOVE / 2 + ENTER, `opacity:1;${raise(0)}`]] : [[T.next, shown(1, raise(1))], [T.next + MOVE, shown(1, raise(0))]]));
        outerRow(i, frames);
        // Your picture is part of your row: it moves exactly as the row does.
        if (i === 1) at('.youpic', frames.map(([t, d]) => [t, d.replace(/opacity:[^;]*;?/, '')]));
    });
    // Your picture is framed once the camera has pulled back, and stays so.
    const framed = `border-radius:${8 * CAM.k}px;box-shadow:0 0 0 ${CAM.k}px var(--border)`, bare = 'border-radius:0px;box-shadow:0 0 0 0px var(--border)';
    at('.inner', [[0, bare], [T.pull, bare], [T.pull + ZOOM, framed]]);
    // The dots open into the opening frame as the camera reaches them.
    at('.inner2', [[0, `opacity:0;border-radius:${HEIGHT / 2}px`], [T.zoomIn + DIVE * 0.45, `opacity:0;border-radius:${HEIGHT / 2}px`], [T.zoomIn + DIVE * 0.8, 'opacity:1;border-radius:0px']]);
    // While pulled back, the stream of looks fades off the bottom edge.
    at('.outfade', [[0, 'opacity:0'], [T.pull, 'opacity:0'], [T.pull + ZOOM, 'opacity:1'], [T.zoomIn, 'opacity:1'], [T.zoomIn + DIVE, 'opacity:0']]);
    return rules.join('');
};
// Reduced motion, where the viewer passes it through: the closing frame, still.
const still = '@media (prefers-reduced-motion:reduce){#stage,#stage *{animation:none!important}.layer{opacity:0}#stage .L-finished{opacity:1}#stage .outfade{opacity:1}}';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: WIDTH, height: 900 }, deviceScaleFactor: 2 });
await page.route('http://readme.test/**', async route => {
    const path = new URL(route.request().url()).pathname.slice(1);
    if (path === 'media/showcase-finished.webp') { await route.fulfill({ body: await readFile(`build/readme/finished-${THEME}.png`), contentType: 'image/png' }); return; }
    const file = path === 'media/fireworks.jpg' ? 'workbench/readme/media/fireworks.jpg' : path.startsWith('media/') ? `workbench/${path}` : `build/readme/${path}`;
    try {
        await route.fulfill({ body: await readFile(file), contentType: { '.css': 'text/css', '.jpg': 'image/jpeg', '.html': 'text/html' }[extname(file)] });
    } catch {
        await route.fulfill({ status: 404 });
    }
});

const sizes = [];
const OUT = out;
let THEME = 'light';
try {
    for (const theme of ['light', 'dark']) {
        names = 0;
        THEME = theme;
        // A finished look's picture is the showcase's finished frame: they watched it through.
        await writeFile('build/readme/page.html', `<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="readme.css"></head><body style="margin:0"><div id="stage" class="${theme} relative overflow-hidden bg-background text-foreground font-sans text-[16px] leading-normal antialiased" style="width:${WIDTH}px;height:${HEIGHT}px"><div class="absolute inset-x-0 top-0">${LAYERS.finished}</div><div class="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-linear-to-b from-transparent to-background"></div></div></body></html>`);
        await page.goto('http://readme.test/page.html');
        await page.locator('#stage').screenshot({ path: `build/readme/finished-${theme}.png` });
        const inner = ORDER.map(key => `<div class="layer L-${key} absolute inset-x-0 top-0">${LAYERS[key]}</div>`).join('')
            + '<div class="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-linear-to-b from-transparent to-background"></div>';
        const fade = '<div class="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-linear-to-b from-transparent to-background"></div>';
        const picture = (wrapper, stage, html) => `<div class="${wrapper} absolute" style="left:0;top:0"><div class="${stage} absolute overflow-hidden bg-background" style="left:0;top:0;width:${WIDTH}px;height:${HEIGHT}px;transform-origin:0 0">${html}</div></div>`;
        const body = `<div class="camera absolute inset-0" style="transform-origin:0 0"><div class="outer px-6 pt-4">${looks}</div>${picture('youpic', 'inner', inner)}${picture('nextpic', 'inner2', `<div class="absolute inset-x-0 top-0">${LAYERS.plain}</div>${fade}`)}</div><div class="outfade pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-linear-to-b from-transparent to-background"></div>`;
        await writeFile('build/readme/page.html', `<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="readme.css"></head><body style="margin:0"><div id="stage" class="${theme} relative overflow-hidden bg-background text-foreground font-sans text-[16px] leading-normal antialiased" style="width:${WIDTH}px;height:${HEIGHT}px">${body}</div></body></html>`);
        await page.goto('http://readme.test/page.html');
        const { tops, pictures } = await page.evaluate(async ({ height, joinCount }) => {
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
                // A row no frame ever brings above the fold is left out: a state that
                // pushes down shows as far below as its first row is tall, the joins as far
                // as their lift reaches, any other state only what fits.
                const reach = key === 'joins' ? tops[key][joinCount] ?? 0 : ['rich1', 'rich2', 'photos1', 'photos2'].includes(key) ? tops[key][1] ?? 0 : 0;
                rows.filter(row => row.getBoundingClientRect().top - layer.getBoundingClientRect().top > height + reach).forEach(row => row.remove());
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
                    // The finished frame inside finished looks is drawn small and lighter.
                    const factor = src.includes('showcase-finished') ? 1.25 : 1.75;
                    canvas.width = Math.max(1, Math.round(w * factor)); canvas.height = Math.max(1, Math.round(h * factor));
                    const scale = Math.max(canvas.width / image.naturalWidth, canvas.height / image.naturalHeight);
                    canvas.getContext('2d').drawImage(image, (canvas.width - image.naturalWidth * scale) / 2, (canvas.height - image.naturalHeight * scale) / 2, image.naturalWidth * scale, image.naturalHeight * scale);
                    encoded.set(src, canvas.toDataURL('image/webp', src.includes('showcase-finished') ? 0.3 : src.includes('fireworks') ? 0.32 : 0.45));
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
        }, { height: HEIGHT, joinCount: JOINS });

        CAM = await page.evaluate(() => {
            const stage = document.getElementById('stage').getBoundingClientRect();
            const rows = [...document.querySelectorAll('.outer [role=feed] > article')];
            rows.forEach((row, i) => row.classList.add(`O${i}`));
            // Your live picture sits over your row's picture. The next look's row
            // gets the typing bubble, and a tiny live opening frame inside it.
            // The typing bubble goes in first: it moves every row under it, so your picture is measured after.
            rows[0].querySelector('.sf-meta').insertAdjacentHTML('afterend', '<div class="typing" style="display:flex;width:max-content;align-items:center;gap:5px;margin-top:8px;padding:11px 13px;border-radius:9999px;background:var(--muted)"><span class="tdot" style="width:7px;height:7px;border-radius:9999px;background:var(--muted-foreground)"></span><span class="tdot" style="width:7px;height:7px;border-radius:9999px;background:var(--muted-foreground)"></span><span class="tdot" style="width:7px;height:7px;border-radius:9999px;background:var(--muted-foreground)"></span></div>');
            const yours = rows[1].querySelector('img').getBoundingClientRect();
            const k = stage.width / yours.width;
            const tops = rows.map(row => row.getBoundingClientRect().top - stage.top);
            const bubble = rows[0].querySelector('.typing').getBoundingClientRect();
            const k2 = stage.width / (bubble.width * 0.8);
            const dots = { x: bubble.left - stage.left + bubble.width / 2 - stage.width / k2 / 2, y: bubble.top - stage.top + bubble.height / 2 - stage.height / k2 / 2 };
            Object.assign(document.querySelector('.youpic').style, { left: `${yours.left - stage.left}px`, top: `${yours.top - stage.top}px` });
            Object.assign(document.querySelector('.inner').style, { transform: `scale(${1 / k})`, borderRadius: `${8 * k}px`, boxShadow: `0 0 0 ${k}px var(--border)` });
            Object.assign(document.querySelector('.nextpic').style, { left: `${dots.x}px`, top: `${dots.y}px` });
            Object.assign(document.querySelector('.inner2').style, { transform: `scale(${1 / k2})`, borderRadius: `${(stage.height / 2) * 1}px`, opacity: '0' });
            // At the start your row holds the top slot, so the camera starts on your picture there.
            const box = { left: yours.left, top: yours.top - (tops[1] - tops[0]) };
            return { x: +(box.left - stage.left).toFixed(2), y: +(box.top - stage.top).toFixed(2), k: +k.toFixed(4), dots: { x: +dots.x.toFixed(2), y: +dots.y.toFixed(2), k: +k2.toFixed(4) }, rows: rows.length - 1, tops: tops.map(top => +top.toFixed(2)) };
        });
        OUTER_ROWS = CAM.rows;
        OUTER_TOPS = CAM.tops;
        // Short class names: every class the stylesheet styles gets one, and
        // the rest (hooks no rule reads) are dropped. The timeline's own names stay.
        const tokens = await page.evaluate(() => [...new Set([...document.querySelectorAll('#stage, #stage [class]')].flatMap(element => [...element.classList]))]);
        const keep = token => /^(layer|L-.+|R\d+|O\d+|p\d+|camera|outer|inner|inner2|youpic|nextpic|outfade|typing|tdot)$/.test(token);
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
            const names = [...element.classList].map(name => /^(layer|L-.+|R\d+|O\d+|p\d+|camera|outer|inner|inner2|youpic|nextpic|outfade|typing|tdot)$/.test(name) ? name : map[name]).filter(Boolean);
            names.length ? element.setAttribute('class', names.join(' ')) : element.removeAttribute('class');
        }), map);

        const xhtml = await page.evaluate(() => new XMLSerializer().serializeToString(document.getElementById('stage')));
        // The rows are measured again where they are drawn, inside the SVG,
        // where a group row can lay out a few pixels apart from the page.
        const build = tops => `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" role="img" aria-label="Inside a feed of people looking at Storyfeed's README, your look's picture shows a feed growing: one plain row gains avatars, a photo and a key-value card; five volunteers joining fold into one grouped row; photos arrive live and regroup with a strip of thumbnails; then one more booking arrives. Your look sits at the top of a long feed of looks at the README; then the next person's arrives above it, still in progress with a typing indicator, whose dots the camera dives into."><style><![CDATA[${styled}${pictures}${timeline(tops)}${still}]]></style><foreignObject width="${WIDTH}" height="${HEIGHT}">${xhtml}</foreignObject></svg>`;
        const measure = await browser.newPage({ viewport: { width: WIDTH, height: HEIGHT } });
        await measure.setContent(`<body style="margin:0">${build(tops)}<style>#stage,#stage *{animation:none!important}</style></body>`);
        const drawn = await measure.evaluate(([keys, K]) => Object.fromEntries(keys.map(key => {
            const layer = document.querySelector(`.L-${key}`);
            const top = layer.getBoundingClientRect().top;
            return [key, [...layer.querySelectorAll('[class~=R0],[class*=" R"],[class^="R"]')].filter(row => /(^| )R\d+( |$)/.test(row.getAttribute('class')))
                .sort((a, b) => +a.getAttribute('class').match(/R(\d+)/)[1] - +b.getAttribute('class').match(/R(\d+)/)[1])
                .map(row => +((row.getBoundingClientRect().top - top) * K).toFixed(2))];
        })), [Object.keys(tops), CAM.k]);
        await measure.close();
        const svg = build({ ...tops, ...drawn });
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
