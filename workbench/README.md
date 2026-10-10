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

Stable selectors are `data-sf-intent` and `data-sf-glyph` on icons, `data-storyfeed-body` on a rendered body wrapper. Shared `sf-*` classes match the Vue kit, including row, headline, rail, avatar, meta, day and body hooks. The inline aspect ratio on media comes from the image dimensions; all static presentation uses Tailwind utilities.

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

## React and three-kit parity

`npm run workbench` builds Blade, Vue and React from the same payload fixtures.
`npm run test:react` covers React SSR; `npm run typecheck:react` checks its public
TypeScript. `npm run test:hydrate` exercises all supported fixtures across server
and browser timezones, live/pinned clocks, native keyboard disclosure and cleanup.

`npm run kit:parity` (also `npm run blade:parity`) compares all three renderer
pairs with the same ordinary group fixtures. Summary rendering is removed.
It requires exactly 0px for every measured rectangle at 1512px/500px and 1440px/390px,
light/dark, collapsed/expanded. Screenshots, zoomed rail joints and the JSON
report use the `r1-` prefix; set `STORYFEED_SCREENSHOTS` to override the output.

KeyValue short/paragraph fixtures check container-driven stacking at exact card
widths 280/360/520/720px and the 28rem content-width boundary, independently of
1512px/390px viewports. Rows share one key column, at most 40% of the card, with
values on one left edge; below the boundary each key sits over its value at
full row width (ui#23). All three kits require 0px geometry parity. The "Type
scale" case also re-renders a row inside a 14px host to check it keeps its own
sizes. Light/dark card captures
and measurements use `k4-`.

## Group strip samples

The "Strip: …" cases in `vue/cases.json` are real core output, not hand-built
nodes: `StripCasesTest.php` publishes four scenes through core (people added
to a project, photos uploaded to an album, a mixed group, a two-member group),
reads them back as a live feed and writes each group into `cases.json`. They
need core 0.18 (every entity has an avatar); install core main and run
`npm run workbench:strip-cases` to regenerate them. The photographs are the
docs world's Unsplash set, reduced in `media/` (credits in `media/CREDITS.md`);
`npm run workbench` copies them to `build/workbench-media/`.
