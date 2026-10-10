import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';

async function measure(card) {
    return card.evaluate(figure => {
        const rect = element => {
            const r = element.getBoundingClientRect();
            const origin = figure.getBoundingClientRect();
            return { x: r.x - origin.x, y: r.y - origin.y, width: r.width, height: r.height };
        };
        const style = getComputedStyle(figure);
        const contentWidth = figure.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
        return {
            card: { width: figure.getBoundingClientRect().width, height: figure.getBoundingClientRect().height },
            contentWidth,
            narrow: contentWidth < 28 * parseFloat(getComputedStyle(document.documentElement).fontSize),
            rows: [...figure.querySelectorAll('.sf-facts__row')].map(row => {
                const label = row.querySelector('dt');
                const value = row.querySelector('dd');
                return { label: rect(label), value: rect(value), row: rect(row), align: getComputedStyle(value).textAlign };
            }),
        };
    });
}

// ui#23: one key column shared by every row, at most 40% of the card, and values on one left edge; on a narrow card each key sits over its value.
function checkLayout(geometry, context) {
    assert.equal(geometry.rows.length, 2, context);
    const [first] = geometry.rows;
    for (const { label, value, row, align } of geometry.rows) {
        const stacked = value.y >= label.y + label.height - 0.02;
        assert.equal(stacked, geometry.narrow, `${context}: layout follows card width`);
        assert.equal(align, 'left', `${context}: values align left`);
        assert.ok(Math.abs(label.x - first.label.x) < 0.02, `${context}: keys share one left edge`);
        assert.ok(Math.abs(value.x - first.value.x) < 0.02, `${context}: values share one left edge`);
        if (stacked) {
            assert.ok(Math.abs(value.x - label.x) < 0.02, `${context}: value starts below its key`);
            assert.ok(Math.abs(value.width - row.width) < 0.02, `${context}: value uses the full row`);
        } else {
            assert.ok(Math.abs(label.y - value.y) < 0.02, `${context}: key aligns with the first value line`);
            assert.ok(label.width <= geometry.contentWidth * 0.4 + 0.02, `${context}: key column is at most 40% of the card`);
        }
    }
}

export async function checkKeyValue({ frames, renderers, width, theme, output }) {
    const report = [];
    for (const kind of ['short', 'paragraph']) {
        const originals = frames.map(frame => frame.locator(`.example:has(>h2:text-is("KeyValue ${kind} values")) .sf-facts`));
        for (let i = 0; i < originals.length; i++) {
            checkLayout(await measure(originals[i]), `${renderers[i]} ${kind} viewport ${width}`);
        }
        // Resize the card independently of the viewport. The test alone lifts
        // max-w-128 so the requested 520/720px card widths are exercised exactly.
        if (![1512, 390].includes(width)) continue;
        // Put the rendered card at the frame origin to avoid clipping distant
        // fixtures when Playwright captures inside a long, scrolled iframe.
        await Promise.all(originals.map(card => card.evaluate(figure => {
            const host = document.createElement('div');
            host.id = 'k4-fixture';
            host.className = figure.closest('.sf-feed').className;
            host.style.cssText = 'position:absolute;top:0;left:0;z-index:9999;background:var(--background)';
            host.append(figure.cloneNode(true));
            document.body.append(host);
        })));
        const cards = frames.map(frame => frame.locator('#k4-fixture .sf-facts'));
        try {
            for (const cardWidth of [280, 360, 473, 474, 520, 720]) {
                const geometry = [];
                for (let i = 0; i < cards.length; i++) {
                    const card = cards[i];
                    await card.evaluate((figure, cardWidth) => { figure.style.width = `${cardWidth}px`; figure.style.maxWidth = 'none'; }, cardWidth);
                    const measured = await measure(card);
                    assert.equal(measured.card.width, cardWidth);
                    checkLayout(measured, `${renderers[i]} ${kind} card ${cardWidth} viewport ${width}`);
                    geometry.push(measured);
                    if (width === 1512 && [280, 360, 520, 720].includes(cardWidth)) {
                        const capture = await card.screenshot();
                        await writeFile(`${output}/k4-${renderers[i]}-${kind}-${theme}-${cardWidth}.png`, capture);
                    }
                }
                for (let i = 1; i < geometry.length; i++) assert.deepEqual(geometry[i], geometry[0], `KeyValue ${kind} ${cardWidth}: 0px ${renderers[0]}/${renderers[i]} parity`);
                report.push({ kind, cardWidth, viewportWidth: width, theme, maxDelta: 0, geometry: geometry[0] });
            }
        } finally {
            await Promise.all(frames.map(frame => frame.locator('#k4-fixture').evaluate(host => host.remove())));
        }
    }
    if (report.length) await writeFile(`${output}/k4-geometry-${theme}-${width}.json`, JSON.stringify(report, null, 2));
}
