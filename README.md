# YouTube WatchLater Wrangler

Bulk‑select and remove videos from your YouTube “Watch Later” playlist. Fast, reliable, and built for very large lists.

## Install
- Install from the Chrome Web Store.
  - Link: add your public listing URL here when published.
- No setup required. Open your Watch Later page: `https://www.youtube.com/playlist?list=WL`.

## How it works
- A small control bar appears under the YouTube masthead on the right.
- Choose one of the selection options, then click “Remove (N)”.
  - Select all (visible)
  - Select all (entire list) with live progress and Cancel
  - Shift‑click to select a range; Invert selection for visible items
- You can Pause/Resume while removing. Double‑click the title to clear selection.

## Why it’s safe
- Runs only on the Watch Later page and never sends data anywhere.
- No extra permissions beyond a content script on `youtube.com`.
- Removal uses the same on‑screen menus you would click yourself.

## Tips
- Very long lists: a short delay between removals keeps YouTube responsive.
- If YouTube’s layout re‑renders while scrolling, selections persist and resync.

## Support
- Issues and feedback: open a GitHub issue in this repository.
- Contact: jonnydigital1@gmail.com

## Changelog
- 1.1.0 — Select‑all (entire) with Cancel/progress; Pause/Resume; range select; invert (visible); selection persistence; locale‑agnostic removal.
- 1.0.0 — Initial release.

## License
© 2025 Jonathan Foye. All rights reserved.
