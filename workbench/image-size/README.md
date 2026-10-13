# Image-size naming review

Run `npm run image-size:preview`, then `npm run image-size:check`.
The preview is `build/image-size/preview/index.html`, with relative assets.
It can be opened locally or served as a static directory.

`PreviewTest.php` records fictional project activities through core, reads them
back, and renders the Blade feed. It writes five size samples and the same
four-project feed twice (`card` and `full`). `preview.mjs` puts those actual
rows in light/dark hosts and links the research sources. Lengths are proposals,
not measurements of those products. Names remain provisional for Jasper's review.

`check.mjs` renders Vue/React components too and measures all three kits in a
headless browser. It verifies limits, picture containment, feed/body precedence,
explicit full, icon-slot images, declared-width compatibility, and narrow-host
overflow. It also compiles the existing bare-kit source scans and measures
each kit with its own CSS, proving both literal class maps are discoverable.
Size choices have no inline styles. Wrapper utilities, app `@theme`, and
`@theme static` can retune the limits; both theme forms are compiled and
measured, with results in `build/image-size/theme-results.json`.
It writes desktop/mobile screenshots and `measurements.json` under
`build/image-size`. No visible browser is launched.

Custom Image renderers in all three kits also use `FeedMedia` with `payload`.
The harness measures linked and unlinked frames at every size, including
inheritance and an unknown size, in light/dark at 640px and 320px host widths.
Portraits, wide images, narrow logos, small pictures and undeclared dimensions
verify both limits and an exact frame-to-image fit. JS measurements compile
only the parent `resources/js` source scan used by vendor-alias imports.
Results go to `build/image-size/media-measurements.json`.

The workbench photo set is deliberately small (192 by 144). Declared image
widths enlarge it here so the comparison exposes the display limits; this
preview is for layout and naming review rather than photo-resolution review.
