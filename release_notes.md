## 🎉 What's New in 1.6.9

### Restore scoped mirroring for the sync-day limit

- Force Sync once again respects each profile's Sync Days Limit instead of overriding it with `0`.
- Remote creates, edits, date changes, and deletion reconciliation are processed only inside that time window; `0` remains unlimited history.
- Deletion reconciliation uses the exact cutoff applied to the API result and scans only in-window Daily Notes, preventing older local history from being treated as deleted merely because it was outside the partial snapshot.
- When an in-window UID previously existed under another date, its old location is still removed to preserve vault-wide uniqueness.
- Retains the complete-pagination gate, local-write gate, shared-heading protection, and attachment-file preservation introduced in 1.6.8.

### Tests

- Added sync-window boundary regression coverage for inclusive cutoff dates, excluded older notes, unlimited `0`, and safely excluded invalid date keys.

---

## 🎉 1.6.9 版本新功能

### 恢复“同步天数限制”的范围镜像语义

- 强制同步重新遵守每个账户配置的“同步天数限制”，不再自动改成 `0`。
- 远端新增、修改、日期调整和删除对齐只处理该时间窗口中的 Memos；设置为 `0` 时才处理全部历史。
- 删除清理使用与 API 结果完全相同的截止时间，只扫描时间窗口内的 Daily Notes，范围外的历史 Memo 不会因为未出现在局部快照中而被误删。
- 同一 UID 从旧日期移动到窗口内日期时，仍会清理其旧位置，确保全库不会留下跨日期重复副本。
- 保留 1.6.8 的完整分页检查、写入成功检查、多账户同标题保护和附件文件保留策略。

### 测试

- 新增同步窗口边界回归测试：截止日包含在内，更早 Daily Note 排除，`0` 保持全历史行为，无效日期安全排除。

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