import { chromium } from 'playwright'
import { createServer } from 'node:http'
import { readFile, mkdir } from 'node:fs/promises'
import { resolve, extname } from 'node:path'
import assert from 'node:assert/strict'

const root = resolve('build/workbench')
const output = process.env.STORYFEED_SCREENSHOTS ?? '/private/tmp/claude-501/-Users-jasper-Dev-projects-storyfeed/2b79c0b9-803e-4825-b1bd-040d9078ad01/scratchpad/kit-adopt'
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
    const page = await browser.newPage({ viewport: { width: 1512, height: 1000 }, deviceScaleFactor: 1 })
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    for (const colour of ['light', 'dark']) {
        await page.emulateMedia({ colorScheme: colour })
        await page.goto(`http://127.0.0.1:${server.address().port}/`)
        await page.evaluate(theme => document.documentElement.classList.toggle('dark', theme === 'dark'), colour)
        await page.evaluate(() => document.fonts.ready)
        assert.equal(await page.getByRole('region', { name: 'KeyValue', exact: true }).locator('dl dt').count(), 4)
        assert.equal(await page.getByRole('region', { name: 'KeyValue', exact: true }).locator('dd').last().innerText(), 'not seated')
        assert.equal(await page.getByRole('region', { name: 'MediaObject', exact: true }).getByRole('link', { name: 'Dinner for two' }).count(), 1)
        assert.equal(await page.getByRole('region', { name: 'MediaObject', exact: true }).locator('img').count(), 1)
        assert.equal(await page.getByRole('region', { name: 'MediaObject', exact: true }).getByRole('link', { name: 'menu.pdf', exact: true }).getAttribute('href'), '/files/menu.pdf')
        assert.equal(await page.getByRole('region', { name: 'ItemList', exact: true }).locator('ol li').count(), 2)
        const image = page.getByRole('region', { name: 'Image', exact: true })
        assert.equal(await image.getByRole('img', { name: 'A pizza on a plate' }).count(), 1)
        assert.equal(await image.locator('figcaption').innerText(), 'Dinner is ready')
        const file = page.getByRole('region', { name: 'FileAttachment', exact: true })
        assert.match(await file.innerText(), /invoice.pdf · 2.4 MB · application\/pdf/)
        const list = page.getByRole('region', { name: 'ItemList', exact: true }).locator('ol')
        assert.equal(await list.evaluate(element => getComputedStyle(element).listStyleType), 'decimal', 'Typography plugin must style the plain list')
        assert.ok(await page.getByRole('region', { name: 'KeyValue', exact: true }).locator('figure').evaluate(element => element.getBoundingClientRect().width <= 512))
        const plain = page.getByRole('region', { name: 'Prose plain', exact: true }).locator('[data-storyfeed-body] .sf-prose')
        assert.equal(await plain.evaluate(element => getComputedStyle(element).whiteSpace), 'pre-wrap')
        assert.match(await plain.innerText(), /arrival\.\nLeave/)
        const markdown = page.getByRole('region', { name: 'Prose Markdown', exact: true })
        assert.equal(await markdown.locator('strong').innerText(), 'Ready for pickup')
        assert.equal(await markdown.locator('ul li').count(), 2)
        assert.equal(await markdown.locator('.sf-rich-text').evaluate(element => getComputedStyle(element).whiteSpace), 'normal')
        assert.equal(await page.getByRole('region', { name: 'Prose HTML', exact: true }).locator('strong').innerText(), 'Order confirmed.')
        const verbatim = page.getByRole('region', { name: 'Prose verbatim', exact: true }).locator('pre')
        assert.equal(await verbatim.innerText(), 'Order #1042\n  status: ready\n  pickup: 12:10 pm\n  result: <confirmed>')
        assert.deepEqual(await verbatim.evaluate(element => {
            const style = getComputedStyle(element)
            return [style.whiteSpace, style.maxHeight, style.overflowY]
        }), ['pre-wrap', '384px', 'auto'])
        const excerpt = page.getByRole('region', { name: 'Excerpt', exact: true })
        assert.match(await excerpt.locator('blockquote').innerText(), /We will be back…$/)
        assert.equal(await excerpt.locator('figcaption').innerText(), 'Customer review')
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
            avatar: getComputedStyle(element.querySelector('.sf-avatar')).width,
        }))
        assert.equal(styles.display, 'flex', 'Tailwind sources must compile the package views')
        assert.equal(styles.avatar, '32px')
        assert.equal(styles.colour, colour === 'dark' ? 'rgb(27, 27, 31)' : 'rgb(255, 255, 255)')
        await page.screenshot({ path: `${output}/b1-after-blade-${colour}-1512.png`, fullPage: true })
        await page.setViewportSize({ width: 500, height: 844 })
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'No horizontal overflow on mobile')
        await page.screenshot({ path: `${output}/b1-after-blade-${colour}-500.png`, fullPage: true })
        await page.setViewportSize({ width: 1512, height: 1000 })
        console.log(`${colour}: compiled styles, keyboard disclosure, and mobile overflow verified`)
    }
    assert.deepEqual(errors, [])
} finally {
    await browser.close()
    server.close()
}
