# Privacy Policy

**Snap Redact** (the "extension")

Last updated: 2026-08-10

## Summary

The extension has no server, and nothing it touches ever leaves your machine.

It does handle one kind of user data, and only one: the picture it takes of the
page you asked it to capture. A picture of a page is website content, so it is
disclosed as such. That picture is produced on your device, kept only in the
memory of the page while you are editing it, and handed straight to your
clipboard or your downloads folder. It is never transmitted anywhere, and the
extension keeps no copy of it.

Nothing else is read, stored, or sent.

## What is stored, and where

Nothing. The extension requests no `storage` permission and writes no files of
its own.

A capture lives only in the memory of the page you are on, for as long as the
overlay is open. Pressing `Esc`, copying, or saving discards it. Uninstalling
the extension therefore leaves no data behind.

`chrome.storage.sync` is **not** used. That API would replicate data through
Google's servers, which would break the guarantee that your data never leaves
your machine.

## What is sent over the network

Nothing.

The extension makes no network requests of any kind. There is no analytics, no
crash reporting, no cloud upload, no external fonts, and no remote code. It
makes no connection to the developer or to any third party.

## What the extension can see

To capture an area, the extension takes a picture of the visible part of the tab
you are on. This happens only after you click the toolbar icon or choose the
context menu item, and only for that tab.

This is what the `activeTab` permission means: the extension has no standing
access to any page. It is granted access to a single tab, at the moment you ask
for a capture, and that access ends when you leave the page.

The picture is drawn into a canvas inside the page and never leaves it.

The extension also reads the address of that one tab, at that moment, for a
single decision: whether the page can be captured at all. Chrome forbids
extensions from running on its own pages and on the Web Store, so those are
refused before anything else happens. The address is used for that check and
then discarded. No list of addresses is built, kept, or sent.

## What is not collected

- Personally identifiable information
- Health, financial, or authentication information
- Location
- Browsing history. The extension holds no `history` permission and cannot see
  the pages you have visited
- The text, forms, cookies or scripts of the page. The extension reads a picture
  of what is already on screen, not the document behind it
- Usage or telemetry data of any kind

## Permissions

| Permission | Why it is needed |
|---|---|
| `activeTab` | Takes a picture of the current tab, after you ask for one |
| `scripting` | Injects the selection overlay into that tab |
| `contextMenus` | Adds the right-click entry that starts a capture |

`clipboardWrite` and `downloads` are deliberately **not** requested. Copying is
triggered from a key press, and saving goes through an ordinary link, so neither
permission is needed.

## What leaves the extension, and when

Only what you explicitly ask for:

| Action | Where it goes |
|---|---|
| Copy | Your system clipboard |
| Save as PNG | Your browser's download location |

Both contain the selected area exactly as shown, with your marks already merged
into the image. Redaction is a solid opaque fill applied before the file is
produced, so the covered pixels are not present in the result and cannot be
recovered from it. Anything inside the selection that you did **not** cover is
included as-is. Check the selection before you copy.

## Third parties

The extension shares no data with anyone, and it is not used for advertising,
profiling, or credit assessment.

## Changes to this policy

Changes will be published in this file. The "Last updated" date above reflects
the most recent revision.

## Contact

Please open an issue at
https://github.com/kojirock5260/snap-redact/issues
