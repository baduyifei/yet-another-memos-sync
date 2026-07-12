# Yet Another Memos Sync — Memos v0.21 Compatibility Fork

An Obsidian plugin fork dedicated to synchronizing self-hosted **Memos v0.21.x** content, images, and attachments into Daily Notes.

> This fork is based on [exusiaiwei/yet-another-memos-sync](https://github.com/exusiaiwei/yet-another-memos-sync) 1.6.1. It replaces the modern Memos client with a v0.21-compatible implementation and is not intended as a universal client for current Memos releases.

**English** · [简体中文（完整文档）](./README.zh-CN.md) · [Releases](https://github.com/baduyifei/yet-another-memos-sync/releases) · [Issues](https://github.com/baduyifei/yet-another-memos-sync/issues)

## Fork changes

### Full Memos v0.21 compatibility

- Uses `/api/v1/memo` instead of `/api/v1/memos`.
- Uses `limit` and `offset` pagination.
- Adapts the legacy JSON-array response to the plugin's internal page model.
- Reads legacy `createdTs` and `resourceList` fields.
- Removes unsupported server-side `created_ts` CEL requests.
- Applies sync-window and incremental filtering locally.

### Local image and attachment backup

- Downloads internal resources from `/o/r/{resource.uid}`.
- Sends the Memos token only to the configured Memos server.
- Copies external resources locally without forwarding the private token.
- Creates the configured attachment folder automatically.
- Skips files that already exist.
- Writes vault-local embeds such as `![[Attachments/996-image.png]]`.

### Automatic header insertion for historical Daily Notes

- If the configured heading exists, its Memo section is updated.
- If it is missing and that day has Memos, the heading and content are appended to the end of the file.
- Empty headings are not created for days without Memos.
- Repeated force syncs do not duplicate the heading.

## Installation

Download `main.js`, `manifest.json`, and `styles.css` from [Releases](https://github.com/baduyifei/yet-another-memos-sync/releases), then place them in:

```text
<Vault>/.obsidian/plugins/yet-another-memos-sync/
```

When replacing the upstream community version, keep your existing `data.json` to preserve profiles, tokens, and sync state.

This fork intentionally keeps the upstream plugin ID. It is a replacement installation and cannot run alongside the upstream plugin. It can also be installed with BRAT from:

```text
https://github.com/baduyifei/yet-another-memos-sync
```

## Required configuration

| Setting | Example |
| --- | --- |
| Memos API URL | `https://your-memos.example.com` |
| API token | Access token created in Memos |
| Daily Memo heading | `## Today‘s Memos` |
| Sync days limit | `30`, or `0` for unlimited history |
| Attachment folder | `Attachments` |
| Skip images | Off to back up images |

After changing the heading, sync window, formatting, or attachment behavior, run **Force Sync All Memos** to reprocess historical content.

## Build

```bash
git clone https://github.com/baduyifei/yet-another-memos-sync.git
cd yet-another-memos-sync
npm install
npm run lint
npm run build
```

## Privacy

- No telemetry or analytics.
- The Memos token is sent only to the configured Memos server.
- Third-party external resource downloads never receive the Memos token.
- Memo content and downloaded resources are written to the local Obsidian vault.
- `data.json` contains secrets and is excluded from Git.

## Copyright and license

- Upstream code remains copyright of its original authors and contributors.
- `Copyright © 2026 baduyifei` applies only to modifications introduced by this fork: Memos v0.21 API compatibility, legacy pagination and filtering, resource backup, local attachment links, and automatic Daily Note heading insertion.
- This fork does not claim ownership of upstream code, Memos, Obsidian, or related third-party projects and trademarks.

Distribution and use are governed by the repository's existing [LICENSE](./LICENSE). See [NOTICE.md](./NOTICE.md) for attribution and modification details. The full operational guide is available in [README.zh-CN.md](./README.zh-CN.md).
