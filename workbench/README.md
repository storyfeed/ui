# Tailwind Workbench

Render the package's Blade components inside Testbench and compile their Tailwind CSS:

```bash
composer install
npm ci
npm run workbench
npx playwright install chromium
npm run screenshots
```

The page is written to `build/workbench/index.html`. The screenshot command starts a local HTTP server, verifies the compiled styles, body examples (including plain, Markdown, HTML and verbatim Prose and Excerpt), keyboard disclosure and mobile overflow, and saves light/dark 1512/500 captures to the B1 evidence directory (override with `STORYFEED_SCREENSHOTS`).

The page uses starter-kit tokens and class-driven dark mode; the root README includes a token block for other apps. No compiled CSS ships with the package. Workbench files and Node tooling are excluded from Composer distribution archives.

The layout and sample meal SVG are original work. The paperclip icon is from Heroicons (MIT); see the root README and `licenses/heroicons.txt`. No Tailwind Plus markup, templates, or class lists were used.

Stable selectors are `data-sf-intent` and `data-sf-glyph` on icons, `data-storyfeed-body` on a rendered body wrapper, and `data-storyfeed-summary` on a summary row. Shared `sf-*` classes match the Vue kit, including row, headline, rail, avatar, meta, day and body hooks. The inline aspect ratio on media comes from the image dimensions; all static presentation uses Tailwind utilities.

`build/workbench/parity.html` renders exactly the Vue workbench's sample,
body and edge-case payloads. `npm run blade:parity` serves both builds, pins
UTC and the fixture clock, checks no page errors or horizontal overflow,
compares row/head/meta/body/avatar/rail/day/disclosure rectangles in light and
dark at 1512 and 500 CSS pixels, and saves paired and individual screenshots.
Each paired image is twice the per-kit viewport width. The gate fails above
0.5px; `b1-geometry.json` records every comparison. It uses native details on
Blade and the Vue toggle on Vue, checking both collapsed and expanded states.
The workbench supplies the same Lucide icon mapping to Blade via the glyph
callback; icon sets remain the consuming application's choice.
