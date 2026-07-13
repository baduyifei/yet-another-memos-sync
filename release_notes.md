## 🎉 What's New in 1.6.5

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

---

## 🎉 1.6.5 版本新功能

### 🎉 稳定 UID 身份

- 新同步的 Memo 改用 Memos API 提供的永久 `memo.uid` 作为 Obsidian 块 ID，例如 `^j3czVVLfdaXpHNwTitnB7B`。
- 唯一键优先级为 `memo.uid` → 稳定 `memo.id` → 时间戳回退；正常的 Memos v0.21.0 数据会始终使用 UID。
- 内部同步记录同时携带 UID 和旧时间戳别名，发现历史 `^时间戳` 块时会原地改为 `^UID`，不会新增第二份。
- Memo 修改内容、时间或日期后 UID 不变，因此不会因 `createdTs` 改变而失去去重身份。
- 去重索引扩展到全部 Daily Notes；UID 已存在于任意日期文件时，不会在另一天再次创建。
- 新增 UID 选择、旧时间戳迁移、修改时间幂等和跨日期去重的自动化回归测试。

### 迁移说明

- 升级后建议先把同步天数设为 `0` 并执行一次强制同步，使全部可对应的历史时间戳块 ID 原地迁移为 UID。
- 如果某条历史 Memo 在迁移前已经改过时间，旧 Markdown 不含 UID，插件无法仅凭已经失效的旧时间戳确定对应关系；这类极少数记录需要人工确认一次。

---

**Installation / 安装方法:**
1. Download the plugin files below / 下载下方的插件文件
2. Extract to your vault's plugins folder: `<vault>/.obsidian/plugins/yet-another-memos-sync/` / 解压到你的库的插件文件夹
3. Enable the plugin in Obsidian settings / 在 Obsidian 设置中启用插件

**Requirements / 系统要求:**
- Obsidian v1.0.0 or higher / Obsidian v1.0.0 或更高版本
- Memos v0.21.0 (dedicated compatibility fork) / Memos v0.21.0（专用兼容版）

**Links / 相关链接:**
- 📖 [Documentation / 文档](https://github.com/baduyifei/yet-another-memos-sync#readme)
- 🐛 [Report Issues / 报告问题](https://github.com/baduyifei/yet-another-memos-sync/issues)
- 💡 [Feature Requests / 功能建议](https://github.com/baduyifei/yet-another-memos-sync/discussions)