# Vue workbench

`npm run workbench` builds both Blade and Vue workbenches. The Vue build goes
under ignored `build/vue/`; it uses only this repository's kit and fixtures.
`npm run test:vue` runs the SSR contract tests.

For visual parity, run `npm run vue:parity`. The reference is read, never
modified, from the docs kit. Override its directory with `STORYFEED_DOCS_FEED`.
`VUEKIT_SCREENSHOTS` overrides the output directory. The default is the U1
scratchpad's `/private/tmp/claude-501/.../scratchpad/vuekit/` evidence directory.
Each pane is 1512 or 500 CSS pixels wide. The paired screenshot is twice that
width; separate reference and converted screenshots are also saved. Both
light/dark themes and collapsed/expanded groups are exercised with a pinned
clock. All shared row/head/meta/body/disc rectangles must agree within 0.05px;
keyboard disclosure and horizontal overflow are checked. Shared live avatar
background and text colours are compared against the reference in both themes.
`geometry.json` records measurements. The extra branch section appears only in the new kit.

The sample payload is the docs kit's production example, copied unchanged.
Additional fixtures cover generic bodies, the four rails and per-item dividers.
The starter-kit token names are mapped to the legacy docs palette for comparison.
Reference CSS is scoped to its pane so it cannot style the converted kit.

Intentional differences from the legacy reference:

- Tombstones use the muted token. Live avatars match the reference
  snapshot/hash palette and white text; avatar colours are content, not theme.
- Secondary dates/divider marks use muted-foreground; the source's separate
  faint colour is not a starter-kit token.
- Prose/list surfaces use card tokens. This corrects the source's dark
  prose selector (`.dark.sf-prose-block`) leaving white prose panels in dark mode;
  lists previously used a translucent white surface in dark mode.
- Verbatim code uses foreground/background tokens, with a dark override to
  keep its surface dark. Rich links use primary tokens.
- Ordered/unordered lists retain their numbering/bullets under Tailwind Preflight.
  The old stylesheet relies on its host to restore markers.
- Focus rings use the ring token. Intent strings remain inert until the app
  adds its own mapping; the source's site-specific intent palettes are excluded.
- Branch dividers are an additive extension taken from the website kit.

There are no residual kit CSS rules. The CSS here contains only token definitions
and workbench framing; all distributed kit presentation is in Tailwind utilities.
