# README showcase

`npm run readme:showcase` renders the Blade fixtures, builds the Tailwind host,
measures the rendered rows, and writes light/dark SVGs and reduced-motion PNGs.
The SVG is 800×520 and loops every 15.7 seconds. The typing hold is 3.0 seconds;
the look beats and final dive stay 1.5 seconds. The PNG is a 2× still of the calm finished feed, before the pullback.
The reduced-motion SVG shows the same feed at the opening camera, with the
README-look rows hidden and its ground/fade transparent.

The outer stage is transparent. Each picture in a row keeps its own background;
the outer feed's bottom fade uses an animated alpha mask. Theme backgrounds
match GitHub (`#ffffff` / `#0d1117`). Packagist paints README image backgrounds
white, including transparent images.

The ending dives into the typing dots, then cuts to the opening camera at
15.679 seconds. It holds that camera across the loop boundary. The old opening
picture inside the dots used a different nested scale pair, which Chromium
snapped about 5 CSS pixels differently despite exact inverse camera coordinates.

For a local build, always set the output directory (the default is core's
`../storyfeed/art/samples`):

```sh
STORYFEED_README_OUT=build/readme/preview npm run readme:showcase
```

If `pngquant` is available, the generator reduces the stills to a palette with a
quality floor of 80, retaining partial alpha. Set `PNGQUANT` to an executable
path if needed. If it is absent or rejects the quality, the RGBA originals stay.
Do not use ffmpeg's thresholded transparency for the bottom fade.

## Local approval preview

Before changing the generator, render the baseline with
`STORYFEED_README_OUT=build/readme/before`. Then build the candidate into
`build/readme/preview` and run:

```sh
node workbench/readme/sweep.mjs
node workbench/readme/preview.mjs
```

The preview script copies the small headers from core's `art/` directory and
writes `build/readme/preview/index.html` with relative paths and inline CSS.
`STORYFEED_CORE_ART` and `STORYFEED_README_BEFORE` can override the input paths.
The baseline input is the 832×588 windowed SVG from UI commit `7588383`.

The page draws every asset as an image on GitHub light/dark and Packagist hosts,
including the PNG stills and a frozen pulled-back frame. It shows the cut and
before/after 2× loop captures, full diffs, and native-scale / exact-camera control
captures. `proof.json` records changed pixel counts, PNG dimensions and alpha
levels, and asset byte sizes. The script fails if the candidate loop captures
differ or a PNG loses partial transparency. All preview output is ignored by Git.

## State handoffs and overlap audit

Each state keeps an explicit opacity hold. A state handoff fades the old state
out during the first half of its existing ENTER/MOVE window, then brings the
new state in during the second half, with the shared easing. Row movement keeps
its original MOVE duration. The final cut uses distinct LAND/CUT keyframes and
step timing, rather than two opacity values at the same keyframe percentage.

Keep the first unframed candidate (`a880d62`) in `build/readme/round2-before`
before regenerating the fixed candidate. `sweep.mjs` audits the original,
first candidate, and current candidate in both themes. It pauses real rendered
CSS animations at each 0.02 s sample across the whole loop, including frame 0
at the loop boundary. It multiplies ancestor opacities, clips row/headline
rectangles to picture/stage bounds, and reports overlapping state layers above
0.05 opacity in the same region. It separately checks readable headline
rectangles, including rows inside the joins fold and the outer You/next-look
rows. `layer-sweep.json` includes every hit and merged time ranges. The audit
fails on any current overlap. The preview includes matching original/before/
after captures at the overlap times in both themes.

Core asset notes for the follow-up PR: replace “is the closing frame, still” in
`art/samples/README.md` with “shows the calm finished feed before the pullback”.
The selected state has the grouped joins, four-photo thumbnails, and actors,
without the You/next-look climax or typing dots. Core files stay untouched here.
