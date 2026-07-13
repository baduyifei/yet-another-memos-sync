## 🎉 What's New in 1.6.7

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

---

## 🎉 1.6.7 版本新功能

### 🎉 UID 驱动的内容更新与跨日移动

- 强制同步现在以永久 UID 执行 upsert：同 UID 已存在时更新为 Memos 当前正文、时间、Callout 和附件引用，而不是忽略远端修改。
- 当 Memo 的 `createdTs` 改到另一天时，先在目标 Daily Note 写入最新记录，确认成功后再从其他日期删除旧 UID 块。
- 跨日移动采用“先复制、后删除”的安全顺序，目标写入失败时保留旧位置，避免同步过程造成备份丢失。
- 旧日期只删除对应 Memo 块，保留 `## Today's Memos` 标题、其他 Memo、Timelog、Notes、属性和 Bases。
- 同一 UID 的历史重复、旧时间戳别名和错误 `memos-{id}` 别名会随移动一并清理。
- 内容或时间更新后再次强制同步保持幂等，全库最终只保留远端当前日期对应的一份 UID。
- 附件文件继续采用安全保留策略，不因 Memo 移动而删除本地文件。

### 同步范围

- 修改过创建时间的历史 Memo 必须被本次 API 拉取到；迁移时建议把同步天数设为 `0` 并执行强制同步。

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