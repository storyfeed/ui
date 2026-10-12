import assert from 'node:assert/strict';
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
    await page.goto(pathToFileURL(resolve('build/image-size/preview/index.html')).href);
    await page.locator('img').evaluateAll(async imgs=>{for(const img of imgs){img.loading='eager';await img.decode();}});
    await page.screenshot({path:'build/image-size/preview/desktop.png',fullPage:true});
    await page.setViewportSize({width:390,height:844});
    await page.screenshot({path:'build/image-size/preview/mobile.png',fullPage:true});
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    await writeFile('build/image-size/measurements.json',JSON.stringify({sizes,precedence},null,2));
    console.log('PASS: 30 kit/theme/size samples match in preview and compiled bare-kit CSS; 6 precedence cases; wrapper retuning; no inline size styles; mobile has no overflow.');
} finally { await browser.close();await server.close(); }
