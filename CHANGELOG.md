# Changelog

All notable changes to Float Islands. The format follows Keep a Changelog and the project uses SemVer.

## [1.3.0] — 2026-11-27

First public release. Consolidates 1.3.0-rc.1 (robust entry sourcing, scanner
hardening) and 1.3.0-rc.2 (i18n, preference migrations, conservative defaults,
package metadata); no code changes since rc.2. Package renamed to
`dsh-float-islands` and verified on DSH 0.2.2-rc.5 after a full restart.

## [1.3.0-rc.2] — 2026-11-27

### Added

- Bilingual UI: runtime copy lives in one dictionary registered with `ctx.locale`, with Chinese as the built-in fallback when a host has no locale service.
- Versioned preference migrations (`_v` 15 → 16): a schema bump now upgrades the stored object instead of resetting it.
- One-time first-run row in settings ("hide native entries" / "later").
- Package metadata for publishing: `dsh.manifestVersion`, `engines.dsh`, MIT license, author, keywords, icon, repository/homepage/bugs.
- `README.en.md`, three preview screenshots rendered from the real client, and `docs/`.
- `scripts/rename.mjs`: rewrites the package name in every file that spells it out.
- Regression suite (`npm test`, 17 cases) plus GitHub Actions CI.

### Changed

- A fresh install no longer hides the host's native sidebar entries: hiding is opt-in, existing profiles keep their stored choice.
- Package renamed from `@local/dsh-float-islands` to `dsh-float-islands`; `private` is now false and `./package.json` is exported.

## [1.3.0-rc.1] — 2026-11-27

### Added

- Second entry channel: panels come from `ctx.slots.entriesOfSlot('sidebar.panellist')`, so a panel that is unpinned into the native More menu (or whose sidebar row is not rendered) still appears in the island with its icon.
- Cached SVG icons per entry id.
- `layout.selectPanel(id)` fallback for activating a panel whose native row is gone.

### Changed

- The scanner watches the sidebar subtree only, coalesces to one pass per frame and publishes only when the content signature changes.
- A scan that finds no native row keeps the previous entry list instead of blanking the island and the settings draft.
- Drag and stored positions are clamped into the viewport; the settings page gained "reset position"; the dock re-measures its top edge on window resize.
- Visibility pass builds a Map instead of calling `entries.find()` per button.

### Fixed

- `button[class*="_trigger"]` was turned into a descendant selector by the scan loop and never matched; zones are now explicit.
- Session-row buttons inside the sidebar are ignored.

## [1.2.3] — 2026-11

### Fixed

- Fast drags no longer lose the pointer (pointer capture), positions are written directly from the pointer event, and the transform rides on custom properties so React re-renders cannot reset it mid-drag.
- Grip tooltip no longer flickers while dragging.

## [1.2.0] — 2026-11

### Added

- Column count drag handle and a columns selector.
- Settings apply immediately except entry migration, which is staged behind Save.

### Fixed

- Popup-type entries opened from the island no longer close themselves on the conversation page.
