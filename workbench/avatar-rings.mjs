import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { serve, pages } from './host.mjs';
const { server, origin } = await serve();
const browser = await chromium.launch({headless:true});
const results = [];
await mkdir('build/avatar-rings',{recursive:true});
try {
    for(const kit of ['blade','vue','react']) for(const theme of ['light','dark']) {
        const page = await browser.newPage({viewport:{width:1000,height:900}});
        // Keep network images pending, so the initial image slot is measured while loading.
        await page.route('**/*', async route=>{
            if(route.request().resourceType()==='image') await new Promise(()=>{});
            else await route.continue();
        });
        await page.goto(`${origin}/${pages[kit]}?theme=${theme}`,{waitUntil:'domcontentloaded'});
        const avatar = page.locator('.sf-avatar:has(>img:not([hidden]))').first();
        await avatar.waitFor();
        const read = locator=>locator.evaluate(node=>{
            const css=getComputedStyle(node);
            const probe=document.createElement('span');probe.style.color='var(--sf-avatar-color)';node.append(probe);
            const expected=getComputedStyle(probe).color;probe.remove();
            return {background:css.backgroundColor,border:css.borderWidth,shadow:css.boxShadow,token:css.getPropertyValue('--sf-avatar-color').trim(),expected,initials:node.textContent.trim(),width:node.getBoundingClientRect().width,height:node.getBoundingClientRect().height,visibleImage:!!node.querySelector('img:not([hidden])')};
        });
        const before = await read(avatar);
        assert.equal(before.background,'rgba(0, 0, 0, 0)');
        assert.equal(before.border,'1px');
        assert.ok(before.token && before.shadow!=='none');
        assert.equal(await avatar.getAttribute('style').then(value=>value.includes('background-color')),false);
        const noImage = page.locator('.sf-avatar[style]:not(:has(img))').first();
        await noImage.waitFor();
        const plain = await read(noImage);
        assert.equal(plain.background,plain.expected);
        assert.ok(plain.initials);
        await avatar.screenshot({path:`build/avatar-rings/${kit}-${theme}-loading.png`});
        // Retain the element handle because Vue/React remove the img and the :has locator would stop matching.
        const handle = await avatar.elementHandle();
        await avatar.locator('img').dispatchEvent('error');
        await page.waitForFunction(node=>!node.querySelector('img:not([hidden])'),handle);
        const after = await read(handle);
        assert.equal(after.background,after.expected);
        assert.equal(after.border,'0px');
        assert.ok(after.initials);
        assert.equal(after.token,before.token);
        assert.equal(after.width,before.width);
        assert.equal(after.height,before.height);
        await handle.screenshot({path:`build/avatar-rings/${kit}-${theme}-failed.png`});
        results.push({kit,theme,before,plain,after});
        await page.close();
    }
    await writeFile('build/avatar-rings/results.json',JSON.stringify(results,null,2));
    console.log('PASS: all three kits in light/dark show neutral rings with visible images and restore brand colour/initials on error without moving the disc.');
} finally {await browser.close();server.close();}
