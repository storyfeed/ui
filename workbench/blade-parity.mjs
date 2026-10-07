import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import assert from 'node:assert/strict';
const output = process.env.STORYFEED_SCREENSHOTS ?? '/private/tmp/claude-501/-Users-jasper-Dev-projects-storyfeed/2b79c0b9-803e-4825-b1bd-040d9078ad01/scratchpad/kit-adopt';
await mkdir(output, {recursive:true});
const server = createServer(async (req,res) => {
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname === '/') { res.setHeader('Content-Type','text/html'); res.end(`<style>body{margin:0;display:flex}iframe{border:0;width:${url.searchParams.get('width')}px;height:6500px;flex-shrink:0}</style><iframe title="Vue" src="/vue/index.html?theme=${url.searchParams.get('theme')}"></iframe><iframe title="Blade" src="/workbench/parity.html?theme=${url.searchParams.get('theme')}"></iframe>`);return; }
    try {
        const path = resolve('build',url.pathname.startsWith('/assets/')?'vue'+url.pathname:url.pathname.slice(1));
        res.setHeader('Content-Type',({'.html':'text/html','.css':'text/css','.js':'text/javascript','.svg':'image/svg+xml'})[extname(path)] ?? 'text/plain');
        res.end(await readFile(path));
    } catch {res.writeHead(404).end();}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser = await chromium.launch();
const report=[];
try {
    for (const width of [1512,500]) for (const theme of ['light','dark']) {
        const page = await browser.newPage({viewport:{width:width*2,height:1000},timezoneId:'UTC'});
        const errors=[];page.on('pageerror',e=>errors.push(e.message));
        await page.goto(`http://127.0.0.1:${server.address().port}/?width=${width}&theme=${theme}`);
        const frames=page.frames().slice(1);
        await Promise.all(frames.map(async frame=>{
            await frame.locator('.sf-feed').first().waitFor();
            await frame.evaluate(theme=>document.documentElement.classList.toggle('dark',theme==='dark'),theme);
            await frame.evaluate(()=>Promise.all([...document.images].map(img=>{ img.loading='eager'; return img.decode().catch(()=>{}); })));
        }));
        for(const state of ['collapsed','expanded']) {
            if(state==='expanded') {
                await frames[0].locator('.sf-toggle').evaluateAll(buttons=>buttons.forEach(button=>{if(button.getAttribute('aria-expanded')==='false') button.click()}));
                await frames[1].locator('details').evaluateAll(nodes=>nodes.forEach(node=>node.open=true));
            }
            const geometry=await Promise.all(frames.map(frame=>frame.evaluate(()=>{
                const selectors=['.sf-feed','.sf-row','.sf-head','.sf-meta','.sf-body-form','.sf-avatar','.sf-rail__line','.sf-day','.sf-toggle','.sf-children'];
                return Object.fromEntries(selectors.map(selector=>[selector,[...document.querySelectorAll(selector)].filter(e=>!e.closest('details:not([open]) .sf-children') && e.getClientRects().length && e.getBoundingClientRect().height>0).map(e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,text:e.textContent.trim().replace(/\s+/g,' ')}})]));
            })));
            const differences=[];let count=0,max=0;
            for(const [selector,rects] of Object.entries(geometry[0])) {
                const other=geometry[1][selector];
                if(rects.length!==other.length) differences.push({selector,count:[rects.length,other.length]});
                for(let i=0;i<Math.min(rects.length,other.length);i++) {
                    count++;
                    const delta=Math.max(...['x','y','w','h'].map(k=>Math.abs(rects[i][k]-other[i][k])));max=Math.max(max,delta);
                    if(delta>0.5) differences.push({selector,i,delta,vue:rects[i],blade:other[i]});
                }
            }
            report.push({width,theme,state,count,max,differences});
            const heights=await Promise.all(frames.map(f=>f.evaluate(()=>document.body.scrollHeight)));
            await page.locator('iframe').evaluateAll((nodes,height)=>nodes.forEach(node=>node.style.height=height+'px'),Math.max(...heights));
            await page.screenshot({path:`${output}/b1-parity-${state}-${theme}-${width}.png`,fullPage:true});
            for (let i=0; i<2; i++) await page.locator('iframe').nth(i).screenshot({path:`${output}/b1-${i===0?'vue':'blade'}-${state}-${theme}-${width}.png`});
        }
        for(let i=0;i<frames.length;i++) {
            assert.equal(await frames[i].evaluate(()=>document.documentElement.scrollWidth > innerWidth),false,`${i}: no horizontal overflow`);
        }
        assert.deepEqual(errors,[]);
        await page.close();
    }
    await writeFile(`${output}/b1-geometry.json`,JSON.stringify(report,null,2));
    console.log(report.map(({differences,...entry})=>({...entry,differences:differences.length})));
    if(process.env.STORYFEED_STRICT_PARITY) assert.ok(report.every(entry=>entry.differences.length===0),'Vue/Blade geometry must match; see b1-geometry.json');
} finally {await browser.close();server.close();}
