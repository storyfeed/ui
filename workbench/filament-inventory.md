# Filament rendering inventory for B1 / F1

Read-only audit, 2026-10-07, of `storyfeed-filament/resources/views`,
`resources/css/index.css` and `src/FeedRendering.php`. F1 consumes the Blade
kit and retains the Filament integration. No Filament files were edited.

| Filament source / presentation | Generic Blade kit counterpart |
|---|---|
| `node`, `avatar`: four rail postures, fallback disc, stacked samples, badges, intent hook, names/initials/colours and tombstones | `rail`, `avatar`, `glyph`; same Vue geometry and data palette; avatar/glyph renderer hooks |
| `node`: authored/fallback/missing headline, redundant history and removal note | core headline reader, `removed` prop/callback |
| `node`, `FeedRendering`: leftover roles, tight meta, relative/calendar ladder and full hover | `meta`, `time`, timezone/label/title props; `time` slot/callback for the plugin's formatter and attributes |
| `node`, `object-icon`: object identity framing the whole content region | `objectIcon` prop/callback and the body slot |
| `node`, `media`: sampled picture grid and overflow tile, hidden when children show | `media-strip` tiles/overflow/renderer; Image-body samples in `group` |
| `detail/{excerpt,prose,image,key-value,item-list,file-attachment,media-object}` and `components/facts` | corresponding `body/*` components and body slot; escaped/sanitized text, booleans/placeholders/verbatim, safe links, named picture slots, list totals/files/footnotes; old version upgrades |
| `detail/note`: app-specific Component called Note | allowlist registry maps Note to an app Blade component; no package-specific convention added |
| `node`: app detail view, suppressed empty body wrappers | `body` / `annotations` callbacks, Component registry, render-before-wrap body dispatch |
| `node`: group toggle, expanded/collapsed/interactive states, dense children and honest truncated counts | native `details` + `interactive`/`collapsed`; payload expanded wins; no JavaScript dependency; dense rail removes badges |
| `feed`: stream versus record timeline, day grouping, day-rail nodes and thread | `grouped`, `divider`, `dividerStyle`, `dividers`, common row rail |
| `feed`: empty and footer/older-control presentation | empty/footer slots, `pager`, root attributes |
| CSS: theme colours, rail/body spacing, media/facts/card/prose sizes, wrapping code, focus and hover, print disclosure | Tailwind tokens/utilities; caller classes, renderer hooks and published components; native details content is exposed in print on browsers supporting `::details-content` |

Integration retained by F1:

- `widget`, `page`, `timeline`, `list`: Filament panels/sections/widgets/pages,
  record scoping, access control, signed/guest surfaces and configured feed queries.
- `see-all`: route and panel-aware URL resolution; host supplies the kit footer.
- `relative-time`, `offline`, `stamp`: Livewire/Alpine refresh, polling,
  freshness/health announcements and absolute render stamps. The kit only
  formats the timestamp supplied at render time.
- `FeedRendering`: app/panel timezone resolution and formatter registration;
  pass the resolved zone and/or `time` callback to the kit. Icon-set resolution
  and validation remain here; `glyph` supplies the resolved SVG.
- `media`: full-resolution loading, modal/lightbox state, focus return and
  image URL policy. The media callback reaches standalone Image and MediaObject bodies as well as
  samples, so the plugin supplies lightbox markup while the kit retains captions,
  body structure and placement. MediaObject exposes beside/below placement.
- Filament theme compilation/registration and token mapping, coarse-pointer
  tap floors, session-free integration behaviour, and Filament-release support.

Presentation changes relative to Filament's own CSS are deliberate kit defaults:
Vue's rail/body geometry, body cards and compact file metadata; token colours;
native disclosure instead of Alpine. A host can retain its tap-target sizing,
media sizing and density via root classes, published views or renderer hooks.
The row drawing is generic; query, refresh and panel policy are not moved here.
