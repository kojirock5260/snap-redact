# Changelog

[日本語](CHANGELOG.ja.md)

## 0.5.0 — 2026-08-18

### Added

- `Cmd+A` / `Ctrl+A` selects the whole capture. It works only before a region is
  chosen; once one is, the key does nothing and is not passed through to the page
- A hint at the bottom of the screen while selecting, covering the drag gesture and
  the select-all key. It swaps places with the toolbar once a region is chosen

### Changed

- Points within 12px of an edge snap to it. The overlay cannot leave the page
  viewport, so a drag cannot start outside the window the way an OS screenshot can.
  Snapping stands in for that
- The toolbar wraps onto more than one row when it does not fit. Rows break between
  groups — tools, colors, output, help — and never inside one
- Groups are separated by spacing rather than vertical rules. A rule left at the end
  of a wrapped row separates nothing
- The help panel and the toast sit above the toolbar whatever its height, instead of
  at a fixed offset that a two-row toolbar would overlap

### Fixed

- Selection froze partway through a drag under DevTools device mode. Touch emulation
  let the browser claim the drag as a scroll and cut the pointer stream short.
  `touch-action: none` prevents it, and `pointercancel` is now handled

Versions before 0.5.0 predate this file.
