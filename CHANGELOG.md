# Changelog

All notable changes to this project will be documented in this file.

## [1.6.7] - 2026-07-13

### UID-driven updates and cross-date moves

- Force sync now upserts by permanent UID: an existing UID is updated to the current Memos content, time, Callout, and attachment references instead of ignoring remote edits.
- When a Memo's `createdTs` moves to another day, the latest record is written to the target Daily Note before the old UID block is removed from other dates.
- Cross-date moves use copy-then-delete ordering. A target write failure leaves the old backup intact.
- Source Daily Notes remove only the matching Memo block while retaining the Memos heading, other Memos, Timelog, Notes, properties, and Bases.
- Historical duplicates, legacy timestamp aliases, and incorrect `memos-{id}` aliases are cleaned up as part of the move.
- Repeating force sync after a content or date update is idempotent; the vault ends with exactly one copy at the current remote date.
- Attachment files remain safely preserved when a Memo moves.

### Sync scope

- The modified historical Memo must be returned by the API. Set the sync window to `0` and run force sync during migration.

## [1.6.6] - 2026-07-13

### UID field fix

- Fixed permanent UID detection for Memos v0.21.0. Its `/api/v1/memo` response exposes the permanent UID through `name`, not `uid`.
- Pagination now preserves `memo.name`, producing the correct block ID such as `^3gb9Yv9UB8nurg42kKtm3V`.
- Database ID `1393` is no longer incorrectly emitted as `^memos-1393`.
- Incorrect `^memos-{id}` blocks written by 1.6.5 are migrated in place to the permanent UID when their Memo is synchronized, without creating a second backup.
- Added regression coverage for the v0.21 `{ id, name }` mapping and database-ID block migration.

### Source verification

- The official Memos v0.21.0 v1 API defines `ID int32 json:"id"` and `Name string json:"name"`, and maps the permanent value with `Name: memo.UID`.

## [1.6.5] - 2026-07-13

### Stable UID identity

- New backups use the permanent Memos `memo.uid` as the Obsidian block ID, for example `^j3czVVLfdaXpHNwTitnB7B`.
- Identity fallback order is `memo.uid` → stable `memo.id` → creation timestamp; normal Memos v0.21.0 records therefore use UID.
- Internal sync records carry both UID and the legacy timestamp alias. A matching historical `^timestamp` block is migrated in place to `^UID` instead of duplicated.
- Editing Memo content, time, or date no longer changes its deduplication identity.
- The uniqueness index now covers every Daily Note, preventing the same UID from being created again under a different date.
- Added regression tests for UID selection, timestamp migration, time-change idempotency, and cross-date deduplication.

### Migration note

- After upgrading, set the sync window to `0` and run force sync once to migrate all matching historical timestamp block IDs to UID.
- If a historical Memo's timestamp changed before this migration, the old Markdown contains no UID and cannot always be matched deterministically from the obsolete timestamp alone; such rare records require one manual review.

## [1.6.4] - 2026-07-12

### Critical fix

- Fixed repeated headings and memos when the configured `Today's Memos` heading used a straight apostrophe while historical templates used typographic `‘` or `’` characters.
- Heading comparison now normalizes common straight and typographic apostrophes.
- Numeric Memo block IDs such as `^1783037940` are now treated as unique keys across the entire Daily Note, not only inside the first matched section.
- Existing Memo IDs use insert-only backup semantics: retain and ignore instead of overwriting, appending another copy, or deleting during force sync.
- Force sync consolidates equivalent duplicate Memos sections and keeps only the first local backup for each duplicated ID.
- A Memo is not inserted again when its ID already exists elsewhere in the Daily Note, even if no matching Memos heading is found.

## [1.6.3] - 2026-07-12

### Changed

- Changed the default Daily Memo heading for newly added profiles to `## Today's Memos`.
- Changed the default attachment folder for new installations from `attachments` to `Attachments`.
- Enabled Callout format by default for new installations.
- The former saved default `attachments` is migrated to `Attachments`; other custom folders, profile headings, and format preferences are not forcibly overwritten.

## [1.6.2] - 2026-07-12

### Added

- **Complete Memos v0.21.0 compatibility** using the legacy `/api/v1/memo` endpoint, array responses, `limit`/`offset` pagination, and legacy resource fields.
- **Local image and attachment backup** through authenticated downloads from `/o/r/{uid}`.
- **Vault-local attachment links** so synced Markdown references files stored inside the Obsidian vault.
- **Automatic Daily Note heading insertion** when a historical note lacks the configured Memos heading and that date has memos to write.

### Fixed

- Fixed HTTP 404 errors caused by calling the newer `/api/v1/memos` endpoint against Memos v0.21.0.
- Fixed missing history caused by unsupported CEL filtering and page-token pagination on v0.21.0.
- Fixed broken image embeds that referenced attachment names without downloading the files.
- Fixed force sync reporting success while silently skipping historical Daily Notes without a pre-existing heading.
- Avoided empty headings on dates without memos and duplicate headings on repeated syncs.

### Improved

- Moved incremental timestamp filtering to the client for legacy-server compatibility.
- Added attachment-directory creation, existing-file reuse, filename collision handling, and protection against sending private tokens to external domains.
- Rewrote both READMEs with fork-specific installation, configuration, migration, troubleshooting, and development documentation.
- Added `NOTICE.md` to document upstream attribution, modification scope, and copyright ownership.

### Compatibility note

- This is a dedicated compatibility fork for **Memos v0.21.0**. It is not intended as a drop-in build for servers that only expose the newer `/api/v1/memos` API.
- The plugin ID is unchanged, so this fork and the upstream plugin must not be enabled at the same time.

## [1.6.1] - 2026-05-13

### Changed

- Fixes to clear the Obsidian community plugin store automated review:
  - Replaced `fetch` with Obsidian's `requestUrl`, so network requests no longer hit CORS limits and the plugin now works on mobile as well as desktop.
  - Replaced raw HTML headings in the settings tab with `new Setting(el).setName(...).setHeading()` for consistent UI styling.
  - Replaced the browser `confirm()` dialog used for profile deletion with a native Obsidian `Modal`.
  - Use Obsidian's bundled `moment` export everywhere instead of reading `window.moment`.
  - Dropped raw `localStorage` access; the legacy v1.5.x sync-state migration via `localStorage` was already completed in 1.6.0, so it has been removed.
  - Replaced the deprecated `builtin-modules` npm package with Node's built-in `node:module#builtinModules`.
  - Release workflow now generates a GitHub artifact attestation (`actions/attest-build-provenance@v2`) for `main.js`, `manifest.json`, and `styles.css`.
  - Removed several unused imports and variables (`PersistedData`, `moment` re-import, `otherLines`, `prefix`).

### Note

- Users upgrading **directly** from 1.5.x to 1.6.1 (skipping 1.6.0) will see one extra full sync after the upgrade because the legacy `localStorage` sync timestamp is no longer read. No data is lost; subsequent syncs revert to incremental.

## [1.6.0] - 2026-05-06

### Added

- **Multi-Profile Sync**: Configure multiple Memos accounts/instances and sync them all into the same vault. Each profile writes to its own daily-note section so accounts never collide. Useful for syncing several family or team members' memos side-by-side.
- **CEL Filter for Incremental Sync**: Incremental sync now passes `created_ts > <lastSyncTime>` to the server, so only new memos are returned over the wire instead of fetching everything and filtering on the client.

### Fixed

- **Pagination Truncation (data loss)**: The previous client capped sync at 1000 memos because `pageToken` was incorrectly populated with a numeric offset. Vaults with more than 1000 memos silently lost history. Sync now follows `nextPageToken` until exhausted.
- **Missing Attachments on v0.27+**: Memos v0.27 renamed `resources` to `attachments`. The plugin now reads `attachments` first and falls back to the legacy fields for older servers.
- **Startup setTimeout Leak**: The auto-sync startup timer was not cleared on plugin unload.

### Changed

- **Sync State Storage**: Last-sync timestamp moved from `localStorage` into plugin data, so Obsidian Sync replicates state across devices instead of each machine starting from scratch.
- **API Client**: Dropped the API-version dropdown. The plugin now always targets `/api/v1/memos`, simplifying the codebase. Existing settings migrate automatically into a default profile.

## [1.5.0] - 2026-02-23

### Added

- **Skip Images Option**: New toggle in settings to skip image resources during sync, preventing image files from polluting the Obsidian vault
- When enabled, only non-image resources are included in synced memos
- Image resources with `type` containing "image" are filtered out

## [1.4.2] - 2025-09-14

### 🚨 Critical Fix

- **CRITICAL:** Fixed smart sync deleting existing memos during incremental synchronization
- Smart sync now correctly preserves existing memos and only adds new content

## [1.4.1] - 2025-09-14

### Improved

- **List Callout Format Enhancement**: Multi-line content now automatically merges into single line with space separation for perfect List Callout plugin visual effect. Tags and timestamps naturally appear at the end of content.

## [1.4.0] - 2025-09-14

### Added

- **Smart Sync**: New intelligent sync mode that automatically detects whether to perform incremental or full sync
- **Todo State Preservation**: 🎯 **IMPORTANT** - Sync now intelligently preserves local todo completion states (- [ ] → - [x]) when merging with remote content
- **Three Sync Modes**:
  - Smart Sync (default): Automatically chooses between incremental and full sync
  - Incremental Sync: Only syncs new memos since last sync
  - Force Sync: Complete resync of all memos, overwriting local changes

### Fixed

- **Incremental Sync Logic**: Fixed issue where incremental sync wasn't working properly - now only processes memos newer than last sync time
- **Sync Efficiency**: Improved sync performance by properly filtering memos at API level instead of processing all memos

### Changed

- **Default Sync Behavior**: Changed default sync command to use Smart Sync for better user experience
- **Command Names**: Updated command names to be more descriptive of their actual behavior

## [1.3.1] - 2024-09-14

### Fixed

- **Settings Real-time Update**: Fixed issue where changing memos header settings required plugin restart to take effect. Now settings changes are applied immediately.

## [1.1.0] - 2024-09-14

### Added

- **Create Missing Daily Notes Setting**: New toggle to control whether to automatically create missing daily note files
- **Improved Multi-line Support**: Better handling of multi-line memos with proper indentation
- **Enhanced Configuration**: More granular control over sync behavior

### Fixed

- **Multi-line Content Formatting**: Fixed issue where multi-line content was not properly formatted as lists
- **Indentation Issues**: Changed from tab-based to space-based indentation for better Markdown compatibility

### Changed

- Multi-line content now uses proper 2-space indentation instead of tabs
- Added option to disable automatic creation of daily note files

## [1.0.0] - 2024-09-13

### Features

- Initial release with modern TypeScript architecture
- Emoji timeline feature with time-based emojis
- Internationalization support (English/Chinese)
- Smart sync with deletion detection
- Support for Memos v0.25.1 and earlier versions
- Flexible API version configuration
