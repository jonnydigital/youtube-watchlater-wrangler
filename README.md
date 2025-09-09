# YouTube WatchLater Wrangler

Bulk‑select and remove videos from your YouTube “Watch Later” playlist. Designed for very large lists with fast selection, cancel/pause safety, and UI that stays out of the way.

## Features
- Select all (visible) or the entire list with live progress and Cancel.
- Shift‑click to select a range; Invert selection for visible items.
- Bulk remove with progress and Pause/Resume;
- Selection is tracked by video ID and persists across refreshes.
- Works reliably as YouTube re‑renders while scrolling.

## Install (load unpacked)
- Open Chrome → `chrome://extensions`.
- Enable “Developer mode”.
- Click “Load unpacked” and choose this folder (must include `manifest.json`).
- Open `https://www.youtube.com/playlist?list=WL`.

## Use
- A compact bar appears under the YouTube masthead on the right.
- Controls: “Select all (visible)”, “Invert”, “Select all (entire)”, and “Remove (N)”.
- Double‑click the title to clear the selection.
- “Select all (entire)” scrolls to load everything; click again to Cancel mid‑way.
- “Remove (N)” processes items sequentially; Pause/Resume is available while removing.

## Notes & limits
- Only activates on `playlist?list=WL` (Watch Later).
- Removal reproduces user clicks; YouTube may rate‑limit very fast deletes, so a short delay is used by design.
- Works across locales; if the “Remove from Watch later” menu text isn’t detected, the extension falls back to endpoint signals.

## Permissions & privacy
- No optional permissions. Runs as a content script on `youtube.com`.
- No analytics, no network requests, and no data leaves your browser.

## Development
- No build step. Edit `content.js` and `styles.css`, refresh the Watch Later page.
- Reset tips/selection via DevTools > Console:
  - `localStorage.removeItem('wlbm_hint_shown')`
  - `localStorage.removeItem('wlbm_selected_ids')`

## Pack for Chrome Web Store
1) Bump `version` in `manifest.json` (e.g., `1.1.0`).
2) Zip the extension root (include `manifest.json`, `content.js`, `styles.css`, and `Images/` icons).
3) Upload the zip in the Developer Dashboard and add listing assets (screenshots, promo image) there.

## Repository layout
- `manifest.json` — MV3 manifest.
- `content.js` — UI, selection, and deletion logic.
- `styles.css` — visual styles for the header, pills, modal, and toasts.
- `Images/` — icons and store artwork.

## Changelog
- 1.1.0 — Select‑all (entire) with Cancel/progress; Pause/Resume; range select; invert (visible); selection persistence; locale‑agnostic removal.
- 1.0.0 — Initial release.

## License
© 2025 Jonathan Foye. All rights reserved.
