## 🎉 What's New in 1.6.6

### UID field fix

- Fixed permanent UID detection for Memos v0.21.0. Its `/api/v1/memo` response exposes the permanent UID through `name`, not `uid`.
- Pagination now preserves `memo.name`, producing the correct block ID such as `^3gb9Yv9UB8nurg42kKtm3V`.
- Database ID `1393` is no longer incorrectly emitted as `^memos-1393`.
- Incorrect `^memos-{id}` blocks written by 1.6.5 are migrated in place to the permanent UID when their Memo is synchronized, without creating a second backup.
- Added regression coverage for the v0.21 `{ id, name }` mapping and database-ID block migration.

### Source verification

- The official Memos v0.21.0 v1 API defines `ID int32 json:"id"` and `Name string json:"name"`, and maps the permanent value with `Name: memo.UID`.

---

## 🎉 1.6.6 版本新功能

### 🚨 UID 字段修复

- 修复 Memos v0.21.0 永久 UID 字段识别错误。该版本 `/api/v1/memo` 返回的永久 UID 位于 `name`，而不是 `uid`。
- 分页转换现在保留 `memo.name`，块 ID 优先使用该永久值，例如 `^3gb9Yv9UB8nurg42kKtm3V`。
- 不再把数据库数字 ID `1393` 错误输出为 `^memos-1393`。
- 已由 1.6.5 写入的 `^memos-{id}` 会在同步到对应 Memo 时原地迁移为正确永久 UID，不产生第二份备份。
- 新增 v0.21 `{ id, name }` 字段映射和错误数据库块 ID 迁移回归测试。

### 技术依据

- Memos v0.21.0 官方源码的 v1 API `Memo` 结构定义为 `ID int32 json:"id"`、`Name string json:"name"`，并通过 `Name: memo.UID` 返回永久 UID。

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