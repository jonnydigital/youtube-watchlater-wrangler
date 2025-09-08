Privacy Policy — YouTube WatchLater Wrangler

Last updated: 2025‑09‑07

Overview
YouTube WatchLater Wrangler is a browser extension that helps you select and remove videos from your YouTube “Watch Later” playlist. The extension runs entirely in your browser. It does not send, sell, or share any data with third parties.

Data Collection
- We do not collect, transmit, or sell any personally identifiable information.
- We do not collect health, financial, authentication, or communications data.
- We do not collect browsing history or usage analytics.

What the extension accesses
- Page content on YouTube Watch Later pages (playlist?list=WL) to insert the selection UI and to identify videos for user‑initiated removal.
- Local, in‑browser storage (localStorage) to persist non‑personal preferences such as selection IDs (so you can resume) and small UI hints.

What the extension does NOT do
- No network requests to external servers.
- No analytics, crash reporting, or advertising SDKs.
- No cross‑site tracking and no data exfiltration.

Permissions
- activeTab: Required to inject the content script and UI into the active YouTube tab after user navigation to the Watch Later page.
- Content script is scoped by match patterns to youtube.com and self‑guards at runtime to only operate on playlist?list=WL.

Data Retention
- Selection IDs and minor UI settings are stored locally in your browser and can be cleared by removing the extension, clearing site data, or using “Clear selection” within the UI.

Children’s Privacy
- This extension is a utility and does not target children or process any personal information about children.

Contact
- Questions or issues? Open an issue on the project’s GitHub repository or contact the developer via the GitHub profile.

