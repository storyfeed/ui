# Tailwind Workbench

Render the package's Blade components inside Testbench and compile their Tailwind CSS:

```bash
composer install
npm ci
npm run workbench
npx playwright install chromium
npm run screenshots
```

The page is written to `build/workbench/index.html`. The screenshot command starts a local HTTP server, verifies the compiled styles, body examples, keyboard disclosure and mobile overflow, and saves light/dark desktop/mobile captures in `workbench/screenshots`.

The page uses Tailwind's default media-query dark mode. Applications may configure their own `dark` variant. No compiled CSS ships with the package. Workbench files and Node tooling are excluded from Composer distribution archives.

The layout and sample SVG are original work. No Tailwind Plus markup, templates, or class lists were used.

Stable selectors are `data-sf-intent` and `data-sf-glyph` on icons, `data-storyfeed-body` on a rendered body wrapper, and `data-storyfeed-summary` on a summary row. There are no `sf-*` hook classes. The inline aspect ratio on media comes from the image dimensions; all static presentation uses Tailwind utilities.
