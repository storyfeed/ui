import { chromium } from 'playwright'

// Screenshots for the actor strip comparison (ui#48): the whole page light and
// dark, plus each section. Expects the page served on 127.0.0.1:5182.
const out = 'build/actor-strip-shots'
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2 })
const errors = []
page.on('pageerror', error => errors.push(error.message))
page.on('console', message => message.type() === 'error' && errors.push(message.text()))
for (const theme of ['light', 'dark']) {
    await page.goto(`http://127.0.0.1:5182/?theme=${theme}`)
    await page.waitForSelector('[data-check]')
    await page.waitForTimeout(300)
    await page.screenshot({ path: `${out}/actor-strip-${theme}.png`, fullPage: true })
    const sections = page.locator('[data-section]')
    for (let i = 0; i < await sections.count(); i++) await sections.nth(i).screenshot({ path: `${out}/actor-strip-${theme}-section${i + 1}.png` })
}
console.log(JSON.stringify(await page.$$eval('[data-variant]', cards => cards.map(card => [card.getAttribute('data-variant'), card.querySelector('.collapsed .sf-headline')?.textContent.replace(/\s+/g, ' ').trim(), card.querySelectorAll('.collapsed .sf-actor-stack .sf-avatar').length, card.querySelector('.sf-actor-stack__more')?.textContent, card.querySelector('[data-check]').innerText.replace(/\n/g, ' | ')])), null, 1))
console.log('errors', errors)
await browser.close()
