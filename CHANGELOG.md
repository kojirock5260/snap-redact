# Changelog

[日本語](CHANGELOG.ja.md)

## 1.0.0 — 2026-09-16

### Added

- Click an element to select it. Before a region is chosen, clicking a page element
  takes that element's rectangle as the selection. The element under the pointer is
  outlined with a dashed frame. It stands in for aiming at edges, and works well for a
  table cell, an avatar, or a line holding an email address. The page DOM is never
  modified; only the rectangle is borrowed
- Click an element to hide or box it. Once a region is chosen, with Hide or Box
  selected, clicking an element inside the region adds a shape that fits it exactly.
  Arrow is excluded, since it needs a direction. Coordinates are rounded outward, so
  no edge pixel of the text is left showing
- Move the selection with the arrow keys, 1px at a time or 10px with Shift. It stops
  at the edge of the capture. Shapes stay where they are: they are attached to places
  on the image, and moving the crop does not change what needs hiding

### Changed

- Version 1.0.0. The extension is on the store, so there is no reason to stay at 0.x
- The hint shown before selecting now reads "Drag an area, or click an element"
- The help panel lists element click and the arrow keys
- Arrow keys are still swallowed, as before, until a region is chosen and while
  something is being dragged. They are never passed to the page
- The exported PNG is RGB instead of RGBA. Nothing in the output is ever transparent,
  so the alpha channel was all 255 and only took up space. About 6% smaller for the
  same image

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
