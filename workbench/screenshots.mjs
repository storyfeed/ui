import { chromium } from 'playwright'
import { createServer } from 'node:http'
import { readFile, mkdir } from 'node:fs/promises'
import { resolve, extname } from 'node:path'
import assert from 'node:assert/strict'

const root = resolve('build/workbench')
const output = resolve('workbench/screenshots')
await mkdir(output, { recursive: true })
const server = createServer(async (request, response) => {
    const files = { '/': 'index.html', '/app.css': 'app.css', '/meal.svg': 'meal.svg' }
    const file = files[request.url]
    if (!file) { response.writeHead(404).end(); return }
    response.setHeader('Content-Type', { '.html': 'text/html', '.css': 'text/css', '.svg': 'image/svg+xml' }[extname(file)])
    response.end(await readFile(resolve(root, file)))
})
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
const browser = await chromium.launch()
try {
    const page = await browser.newPage({ viewport: { width: 900, height: 1000 }, deviceScaleFactor: 1 })
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    for (const colour of ['light', 'dark']) {
        await page.emulateMedia({ colorScheme: colour })
        await page.goto(`http://127.0.0.1:${server.address().port}/`)
        await page.evaluate(() => document.fonts.ready)
        assert.equal(await page.getByRole('region', { name: 'KeyValue', exact: true }).locator('dl dt').count(), 4)
        assert.equal(await page.getByRole('region', { name: 'MediaObject', exact: true }).getByRole('link', { name: 'Dinner for two' }).count(), 1)
        assert.equal(await page.getByRole('region', { name: 'MediaObject', exact: true }).locator('img').count(), 1)
        assert.equal(await page.getByRole('region', { name: 'ItemList', exact: true }).locator('ol li').count(), 2)
        assert.match(await page.getByRole('region', { name: 'File', exact: true }).innerText(), /invoice.pdf · 2.4 MB/)
        const disclosure = page.getByRole('region', { name: 'Group row and members', exact: true }).locator('details')
        const toggle = disclosure.locator('summary')
        await toggle.focus()
        await page.keyboard.press('Enter')
        assert.equal(await disclosure.getAttribute('open'), '')
        assert.equal(await toggle.innerText(), 'Show less')
        await page.keyboard.press('Enter')
        assert.equal(await disclosure.getAttribute('open'), null)
        assert.match(await toggle.innerText(), /Show all/)
        await page.locator('details').evaluateAll(items => items.forEach(item => item.open = true))
        await page.locator('h1').click()
        const styles = await page.locator('article').first().evaluate(element => ({
            display: getComputedStyle(element).display,
            colour: getComputedStyle(document.body).backgroundColor,
            icon: getComputedStyle(element.querySelector('svg')).width,
        }))
        assert.equal(styles.display, 'flex', 'Tailwind sources must compile the package views')
        assert.equal(styles.icon, '14px')
        assert.equal(styles.colour, colour === 'dark' ? 'oklch(0.21 0.006 285.885)' : 'rgb(255, 255, 255)')
        await page.screenshot({ path: `${output}/${colour}.png`, fullPage: true })
        await page.setViewportSize({ width: 390, height: 844 })
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'No horizontal overflow on mobile')
        await page.screenshot({ path: `${output}/${colour}-mobile.png`, fullPage: true })
        await page.setViewportSize({ width: 900, height: 1000 })
        console.log(`${colour}: compiled styles, keyboard disclosure, and mobile overflow verified`)
    }
    assert.deepEqual(errors, [])
} finally {
    await browser.close()
    server.close()
}
