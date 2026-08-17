# Snap Redact

[日本語](README.ja.md)

Select an area, hide it, box it, point at it, then straight to the clipboard.
A Chrome extension.

## Principles

- **No install warnings**: `permissions` is only `activeTab`, `scripting` and `contextMenus`. None of them shows a warning
- **Zero external communication**: no analytics, no cloud upload, no external fonts. Your screenshots never leave your machine
- **One trip**: no mode picker, no separate editor tab. Select, mark, copy
- **Only what is needed**: area selection only. Full-page capture is already well served elsewhere
- **English and Japanese**: the UI follows your browser's display language. No setting to choose, and no preference to store

## Privacy

Nothing is collected or transmitted. The capture is processed inside the page and
handed straight to the clipboard or to a download. No `storage` permission is
requested, so the extension keeps nothing. See the
[Privacy Policy](PRIVACY.md) for details.

## Install

Chrome Web Store: (not published)

See the [changelog](CHANGELOG.md) for what changed in each version.

## Development

```bash
npm install
npm run build   # outputs to dist/
```

To run your build in Chrome:

1. Open `chrome://extensions`
2. Turn on "Developer mode" in the top right
3. "Load unpacked" → select the `dist/` folder

## Usage

Click the toolbar icon, right-click a page and choose the menu item, or press
`Cmd+Shift+E` (`Ctrl+Shift+E` on Windows and Linux). Change the key at
`chrome://extensions/shortcuts`.

**Use the shortcut to capture things that only appear while hovering.** Moving
the pointer to the toolbar icon or to the right-click menu drops the hover and
the element disappears. A key press leaves the pointer where it is, so the
element stays on screen and lands in the capture. What the browser itself draws
— `title` tooltips, `<select>` dropdowns — is outside the page and is never
captured.

| Action | Key |
|---|---|
| Select an area | drag |
| Select the whole capture | `Cmd+A` |
| Adjust the selection | drag a handle on its edge |
| Draw a shape | drag inside the selection |
| Hide / Box / Arrow | `1` / `2` / `3` |
| Undo | `Cmd+Z` |
| Copy | `Cmd+C` or `Enter` |
| Save as PNG | `Cmd+S` |
| Help | `?` |
| Cancel | `Esc` |

The overlay lives inside the page viewport, so unlike an OS screenshot you cannot
start a drag outside the window. Points within 12px of an edge snap to it, so the
outermost pixels need no aiming. When the viewport is narrow — DevTools device
mode, say — `Cmd+A` and then a handle drag beats aiming for the corners.

## Layout

```
src/
  domain/        pure rules. no DOM, no chrome.*, fully unit tested
  application/   side effects through browser APIs (capture, clipboard, download, notify)
  presentation/  the overlay: shadow DOM, canvas, events
  background.ts  service worker. three entry points, nothing else
  content.ts     injected script. guards against double injection
```

`domain` never imports from the layers above it. That is what keeps the tricky
parts — key handling, arrow geometry, which pages can be captured — testable
in plain Node.

## Notes

- **Redaction is always a solid opaque fill.** Mosaic and blur are not offered,
  because both can be reversed
- **The selection can be resized, but not moved.** Eight handles sit on its edges.
  Moving it wholesale is not offered; drag the opposite edges instead, or start over
- **Shapes cannot be moved or resized after drawing.** Undo and draw again
- **No text annotation.** Writing "see the arrow" next to the image is enough
- **Some pages cannot be injected into**: the Web Store, `chrome://` pages, and
  `file://` unless "Allow access to file URLs" is on. There is no popup to put
  an error in, so the toolbar icon shows a red `!` and the reason in its tooltip
- **`clipboardWrite` is deliberately not requested**; it would add a
  "Modify data you copy and paste" warning. Copying is triggered from a key
  press instead. On `http:` pages copying is refused by the browser, and the
  overlay points you at saving instead

## Test and Lint

```bash
npm test          # run Vitest once
npm run test:watch
npm run lint      # Biome (lint + format check)
npm run lint:fix  # apply fixes
```

## Contributing

As a security policy, **pull requests are not being accepted for now.**

Please open an Issue for bug reports and suggestions.

## About development

This project is built with the help of [Claude](https://claude.com) (Anthropic).
