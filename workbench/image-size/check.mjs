import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { chromium } from 'playwright';
import { createServer } from 'vite';
import vue from '@vitejs/plugin-vue';
import { createSSRApp, h as vh } from 'vue';
import { renderToString as vr } from 'vue/server-renderer';
import { createElement as rh } from 'react';
import { renderToString as rr } from 'react-dom/server';
const server = await createServer({ configFile:false, plugins:[vue()], esbuild:{jsx:'automatic'}, optimizeDeps:{noDiscovery:true}, server:{middlewareMode:true,hmr:false}, appType:'custom', ssr:{external:['vue','vue/server-renderer','react','react/jsx-runtime','react-dom/server','lucide-react','lucide-vue-next']} });
const browser = await chromium.launch({ headless:true });
try {
    const { default: VFeed } = await server.ssrLoadModule('/resources/js/vue/FeedStream.vue');
    const { Image: RImage } = await server.ssrLoadModule('/resources/js/react/body/index.tsx');
    const { default: RFeed } = await server.ssrLoadModule('/resources/js/react/FeedStream.tsx');
    const { default: VMedia } = await server.ssrLoadModule('/resources/js/vue/FeedMedia.vue');
    const { FEED_BODIES } = await server.ssrLoadModule('/resources/js/vue/keys.ts');
    const { FeedProvider, FeedMedia: RMedia } = await server.ssrLoadModule('/resources/js/react/index.ts');
    const { pictureOf } = await server.ssrLoadModule('/resources/js/shared/body.ts');
    const VLinkedImage = {
        props: ['payload', 'entityMedia', 'entityUrl'],
        setup: props => () => vh(VMedia, { image: pictureOf(props.payload, props.entityMedia), payload: props.payload, href: props.entityUrl }),
    };
    const RLinkedImage = ({ payload, entityMedia, entityUrl }) => rh(RMedia, { image: pictureOf(payload, entityMedia), payload, href: entityUrl });
    const rows = JSON.parse(await readFile('build/image-size/rows.json','utf8'));
    const names = ['thumbnail','inline','card','feature','full'];
    const payload = size => ({ $body:'Storyfeed/Body/Image',$v:3,src:'media/fair.jpg',width:1200,height:800,alt:'Fair',$meta:{size} });
    let html = '';
    for (const theme of ['light','dark']) for (const name of names) {
        const item = {kind:'activity',id:'1',verb:null,published_at:null,headline_template:null,headline:'Maple Street Fair',object:{type:'project',id:'1',label:'Maple Street Fair',body:[payload(name)]}};
        const props = {items:[item],grouped:false,rail:'activity-only',interactive:false};
        const rendered = { blade:rows.sizes[name], vue:await vr(createSSRApp({render:()=>vh(VFeed,props)})), react:rr(rh(RFeed,props)) };
        for (const [kit,row] of Object.entries(rendered)) html += `<div class="${theme}" data-kit="${kit}" data-size="${name}" style="width:640px">${row}</div>`;
    }
    // Test feed precedence with real feed components, including the icon-slot optimization.
    for (const own of [undefined,'inline','full']) for (const kit of ['vue','react']) {
        const item = {kind:'activity',id:'1',verb:null,published_at:null,headline_template:null,headline:'Maple Fair',object:{type:'project',id:'1',label:'Maple Fair',body:[{...payload(own),src:undefined,image:'icon'}],media:{icon:{src:'media/fair.jpg',alt:'Fair',width:1200,height:800}}}};
        const props = {items:[item],imageSize:'card',grouped:false};
        const row = kit === 'vue' ? await vr(createSSRApp({render:()=>vh(VFeed,props)})) : rr(rh(RFeed,props));
        html += `<div data-kit="${kit}" data-precedence="${own ?? 'inherit'}" style="width:640px">${row}</div>`;
    }
    await writeFile('build/image-size/preview/parity.html',`<!doctype html><link rel="stylesheet" href="preview.css"><body>${html}</body>`);
    const page = await browser.newPage({viewport:{width:1400,height:1100}});
    await page.goto(pathToFileURL(resolve('build/image-size/preview/parity.html')).href);
    await page.locator('img').evaluateAll(async imgs => { for (const img of imgs) { img.loading='eager'; await img.decode(); } });
    assert.equal(await page.locator('.sf-feed[style], .sf-image[style]').count(), 0, 'Size choices must not add inline styles');
    const sizes = await page.locator('[data-size]').evaluateAll(nodes => nodes.map(node=>{const img=node.querySelector('img'), style=getComputedStyle(img),r=img.getBoundingClientRect();return {kit:node.dataset.kit,size:node.dataset.size,theme:node.className,width:r.width,height:r.height,natural:img.naturalWidth/img.naturalHeight,fit:style.objectFit};}));
    for (const row of sizes) {
        assert.equal(row.fit,'contain');
        assert.ok(Math.abs(row.width/row.height-row.natural)<0.01, JSON.stringify(row));
        const limits = {thumbnail:[96,96],inline:[256,192],card:[384,288],feature:[576,432],full:[640,Infinity]}[row.size];
        assert.ok(row.width<=limits[0]+1 && row.height<=limits[1]+1,JSON.stringify(row));
    }
    // Equivalent feed columns, including full, must produce the same image dimensions.
    for (const name of names) {
        const sample=sizes.filter(r=>r.size===name);
        for (const row of sample) assert.ok(Math.abs(row.width-sample[0].width)<1 && Math.abs(row.height-sample[0].height)<1,JSON.stringify(sample));
    }
    const precedence = await page.locator('[data-precedence]').evaluateAll(nodes=>nodes.map(n=>({kit:n.dataset.kit,choice:n.dataset.precedence,width:n.querySelector('.sf-image img').getBoundingClientRect().width,ratio:n.querySelector('.sf-image img').naturalWidth/n.querySelector('.sf-image img').naturalHeight})));
    for (const row of precedence) assert.ok(Math.abs(row.width-({inherit:Math.min(384,288*row.ratio),inline:Math.min(256,192*row.ratio),full:596}[row.choice]))<2,JSON.stringify(row));
    // Compile the existing source scans alone: no stylesheet import or safelist can supply the size rules.
    await page.evaluate(()=>{document.querySelector('link').sheet.disabled=true;const style=document.createElement('style');style.id='kit-source-scan';document.head.append(style);});
    for(const kit of ['blade','vue','react']) {
        const css = await readFile(`build/bare/${kit}.css`,'utf8');
        await page.evaluate(css=>{document.querySelector('#kit-source-scan').textContent=css;},css);
        const actual = await page.locator(`[data-kit="${kit}"][data-size]`).evaluateAll(nodes=>nodes.map(node=>{const img=node.querySelector('.sf-image img');return {kit:node.dataset.kit,size:node.dataset.size,theme:node.className,width:img.clientWidth,height:img.clientHeight,fit:getComputedStyle(img).objectFit};}));
        for(const row of actual) {
            const expected = sizes.find(value=>value.kit===row.kit && value.size===row.size && value.theme===row.theme);
            assert.ok(Math.abs(row.width-expected.width)<1 && Math.abs(row.height-expected.height)<1,JSON.stringify({actual:row,expected}));
            assert.equal(row.fit,'contain');
        }
    }
    await page.evaluate(()=>{document.querySelector('#kit-source-scan').remove();document.querySelector('link').sheet.disabled=false;});
    // An app can configure tokens in its own @theme; verify whether static emission is needed.
    const compile = promisify(execFile);
    const themeResults = [];
    for(const mode of ['', ' static']) {
        const name = mode ? 'static' : 'ordinary';
        const input = `build/image-size/theme-${name}.css`;
        const output = `build/image-size/theme-${name}-built.css`;
        await writeFile(input, `@import "../../workbench/bare/blade.css";\n@theme${mode} { --sf-image-size-inline: 20rem; --sf-image-size-inline-height: 15rem; }\n`);
        await compile('node_modules/.bin/tailwindcss',['-i',input,'-o',output,'--minify']);
        const css = await readFile(output,'utf8');
        await page.evaluate(css=>{document.querySelector('link').sheet.disabled=true;const style=document.createElement('style');style.id='app-theme';style.textContent=css;document.head.append(style);},css);
        const result = await page.locator('[data-size="inline"] .sf-image img').evaluateAll(imgs=>({token:getComputedStyle(document.documentElement).getPropertyValue('--sf-image-size-inline').trim(),sizes:imgs.map(img=>({width:img.clientWidth,height:img.clientHeight}))}));
        const works = result.token === '20rem' && result.sizes.every(row=>Math.abs(row.width-320)<1 && Math.abs(row.height-240)<1);
        themeResults.push({mode:name,works,...result});
        assert.ok(works,JSON.stringify({mode:name,...result}));
        await page.evaluate(()=>{document.querySelector('#app-theme').remove();document.querySelector('link').sheet.disabled=false;});
    }
    await writeFile('build/image-size/theme-results.json',JSON.stringify(themeResults,null,2));
    await page.locator('[data-size="card"]').evaluateAll(nodes=>nodes.forEach(node=>node.classList.add('[--sf-image-size-card:20rem]', '[--sf-image-size-card-height:15rem]')));
    const tuned = await page.locator('[data-size="card"] .sf-image img').evaluateAll(imgs=>imgs.map(img=>({width:img.clientWidth,height:img.clientHeight})));
    for(const row of tuned) assert.ok(Math.abs(row.width-320)<1 && Math.abs(row.height-240)<1,JSON.stringify(row));
    // Tall/wide pictures remain contained; full retains an existing declared width.
    const css = await readFile('build/image-size/preview/preview.css', 'utf8');
    const shapesHtml = [ [800,1200,'card'], [1600,400,'card'], [160,120,'full'] ].map(([width,height,size]) => rr(rh(RImage,{payload:{$body:'Storyfeed/Body/Image',$v:3,src:`data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='${width}' height='${height}'%3E%3Crect width='${width}' height='${height}' fill='tomato'/%3E%3C/svg%3E`,width,height,$meta:{size}}}))).join('');
    await page.setContent(`<style>${css}</style><div class="w-160">${shapesHtml}</div>`);
    await page.locator('img').evaluateAll(async imgs=>{for(const img of imgs) await img.decode();});
    const shapes = await page.locator('img').evaluateAll(imgs=>imgs.map(img=>({width:img.clientWidth,height:img.clientHeight,fit:getComputedStyle(img).objectFit})));
    for(const row of shapes.slice(0,2)) {assert.equal(row.fit,'contain'); assert.ok(row.width<=384 && row.height<=288);}
    assert.equal(shapes[2].width,160);

    // Custom renderers use FeedMedia, not the kit's Image. Exercise both links and
    // divs, inherited/own sizes, height-limited portraits and small intrinsic logos.
    const mediaCases = JSON.parse(await readFile('build/image-size/media.json', 'utf8'));
    let mediaHtml = '';
    for (const [index, sample] of mediaCases.entries()) {
        const props = { items: [sample.item], imageSize: 'card', grouped: false, rail: 'activity-only' };
        const app = createSSRApp({ render: () => vh(VFeed, props) });
        app.provide(FEED_BODIES, { 'Storyfeed/Body/Image': VLinkedImage });
        const rendered = { blade: sample.html, vue: await vr(app), react: rr(rh(FeedProvider, { FEED_BODIES: { 'Storyfeed/Body/Image': RLinkedImage } }, rh(RFeed, props))) };
        for (const theme of ['light', 'dark']) for (const [kit, row] of Object.entries(rendered)) {
            mediaHtml += `<div class="${theme}" data-media-case="${index}" data-kit="${kit}" style="width:640px;background:var(--background);color:var(--foreground)">${row}</div>`;
        }
    }
    await writeFile('build/image-size/preview/media.html', `<!doctype html><body>${mediaHtml}</body>`);
    await page.setContent(mediaHtml);
    await page.locator('img').evaluateAll(async imgs => { for (const img of imgs) { img.loading = 'eager'; await img.decode(); } });
    const mediaMeasurements = [];
    // The README's vendor-alias path scans the parent JS directory, not only
    // vue/ or react/. Use that scan alone, with the bare host's colour tokens.
    const vendorInput = 'build/image-size/vendor-source.css';
    const bareHost = (await readFile('workbench/bare/vue.css', 'utf8')).replace(/@source[^;]+;/g, '');
    await writeFile(vendorInput, `${bareHost}\n@source "../../resources/js";\n`);
    await compile('node_modules/.bin/tailwindcss', ['-i', vendorInput, '-o', 'build/image-size/vendor-source-built.css']);
    for (const kit of ['blade', 'vue', 'react']) {
        const kitCss = await readFile(kit === 'blade' ? 'build/bare/blade.css' : 'build/image-size/vendor-source-built.css', 'utf8');
        await page.evaluate(css => { document.head.innerHTML = `<style>${css}</style>`; }, kitCss);
        for (const hostWidth of [640, 320]) {
            await page.locator('[data-media-case]').evaluateAll((nodes, width) => nodes.forEach(node => { node.style.width = `${width}px`; }), hostWidth);
            const actual = await page.locator(`[data-media-case][data-kit="${kit}"]`).evaluateAll(nodes => nodes.map(node => {
                const frame = node.querySelector('.sf-media'), img = frame.querySelector('img');
                const rect = element => { const r = element.getBoundingClientRect(); return { width: r.width, height: r.height }; };
                return { index: Number(node.dataset.mediaCase), theme: node.className, frame: rect(frame), image: rect(img), column: rect(node.querySelector('.sf-body')).width, fit: getComputedStyle(img).objectFit, background: getComputedStyle(frame).backgroundColor, href: frame.getAttribute('href') };
            }));
            for (const row of actual) {
                const sample = mediaCases[row.index];
                const size = ['inherit', 'unknown'].includes(sample.size) ? 'card' : sample.size;
                const [maxWidth, maxHeight] = { thumbnail: [96, 96], inline: [256, 192], card: [384, 288], feature: [576, 432], full: [Infinity, Infinity] }[size];
                const scale = Math.min(1, maxWidth / sample.width, maxHeight / sample.height, row.column / sample.width);
                assert.ok(Math.abs(row.image.width - sample.width * scale) < 1 && Math.abs(row.image.height - sample.height * scale) < 1, JSON.stringify({ kit, hostWidth, sample: { size, shape: sample.shape }, row }));
                assert.ok(Math.abs(row.frame.width - row.image.width) < 1 && Math.abs(row.frame.height - row.image.height) < 1, JSON.stringify({ kit, hostWidth, sample: { size, shape: sample.shape }, row }));
                assert.equal(row.fit, 'contain');
                assert.equal(row.background, 'rgba(0, 0, 0, 0)');
                assert.equal(row.href, sample.linked ? '/project' : null);
                mediaMeasurements.push({ kit, hostWidth, size, shape: sample.shape, ...row });
            }
        }
    }
    await writeFile('build/image-size/media-measurements.json', JSON.stringify(mediaMeasurements, null, 2));
    await page.goto(pathToFileURL(resolve('build/image-size/preview/index.html')).href);
    await page.locator('img').evaluateAll(async imgs=>{for(const img of imgs){img.loading='eager';await img.decode();}});
    await page.screenshot({path:'build/image-size/preview/desktop.png',fullPage:true});
    await page.setViewportSize({width:390,height:844});
    await page.screenshot({path:'build/image-size/preview/mobile.png',fullPage:true});
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    await writeFile('build/image-size/measurements.json',JSON.stringify({sizes,precedence},null,2));
    console.log('PASS: 30 kit/theme/size samples match in preview and compiled bare-kit CSS; 6 precedence cases; wrapper retuning; app @theme emission; no inline size styles; mobile has no overflow.');
    console.log(`PASS: ${mediaMeasurements.length} custom-renderer samples honour feed/body sizes; frames match pictures in light/dark at 640/320px; parent-js source scan emits sizing utilities.`);
} finally { await browser.close();await server.close(); }
