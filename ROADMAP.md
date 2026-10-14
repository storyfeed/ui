# Roadmap

storyfeed/ui 1.0 means Blade, Vue and React kits that render any Payload v1 feed
correctly with no configuration, behind a component API that won't break.

**Versions are milestones, not dates.**

## Shipped

- [x] **[v0.10 — Headline text](https://github.com/storyfeed/ui/milestone/8).**
      Each kit draws a headline's text through one seam, with an opt-in
      `inlineCode` formatter for `` `code` `` spans.

Earlier releases: see [CHANGELOG.md](CHANGELOG.md).

## The countdown to 1.0

Each version below is a GitHub milestone holding its concrete issues. Issue
titles start with the version they target, such as `[0.10]`. Milestones show
the current plan: items may be reordered, moved to a later version or dropped as
the work teaches us, and a dropped item is closed as not planned with its reason.

- [ ] **[v0.11 — Motion and image sizes](https://github.com/storyfeed/ui/milestone/9).**
      Kits animate: groups expand in place, Live arrivals slide in. Custom
      Image renderers and `FeedMedia` follow the feed's image sizes.
- [ ] **[v1.0 — Stable](https://github.com/storyfeed/ui/milestone/2).**
      storyfeed/ui 1.0 ships alongside core 1.0: Blade, Vue and React kits with
      a frozen component API, rendering Payload v1 unchanged once core declares
      it stable with its release candidate.

## After 1.0

Planned for the [1.x line](https://github.com/storyfeed/ui/milestone/7), in no
particular order, such as letting apps choose what a group's strip previews and
phrasing a row for the reader who did it ("You closed the list").
