## 🎉 What's New in 1.6.8

### Remote-authoritative Memos mirror

- Force Sync now treats Memos as the authoritative source: remote creates are inserted, edits are updated by permanent UID, creation-date changes move records between Daily Notes, and remote deletions remove the matching local Memo block.
- Force Sync ignores the configured day limit and reads the complete paginated history before computing deletions, preventing out-of-window history from being mistaken for deleted data.
- Reconciliation only removes plugin-managed blocks under the configured account heading. Properties, Timelog, Notes, Bases, other headings, and ordinary Daily Note content remain untouched.
- Destructive reconciliation is safety-gated: it runs only after remote pagination, Memo conversion, attachment processing, and all local writes complete successfully. Any incomplete step skips deletion.
- Smart and Incremental sync remain non-destructive because their snapshots are incomplete.
- Force Sync replaces managed Memo content with the current remote representation. Downloaded attachment files remain preserved even when a remote Memo is deleted.
- Deletion reconciliation is disabled when multiple enabled profiles share the same Daily Memo heading, preventing one account from deleting another account's records.

### Tests

- Added regression coverage for reducing several local Memo blocks to the one UID present remotely while preserving the heading and unrelated Daily Note content.

---

## 🎉 1.6.8 版本新功能

### Memos 权威镜像与远端删除同步

- “强制同步所有备忘录”现在将 Memos 作为唯一权威数据源：远端创建则本地创建，远端修改则按永久 UID 更新，远端改变创建日期则跨 Daily Note 移动，远端删除则移除 Obsidian 中对应的 Memo 块。
- 强制同步自动忽略“同步天数限制”，完整读取 Memos 全部分页后再计算删除差集，避免把范围外的历史 Memo 误判为已删除。
- 删除清理只作用于该账户配置标题下、带插件 Memo 块 ID 的记录；Daily Note 的属性、Timelog、Notes、Bases、其他标题和普通正文不受影响。
- 增加删除安全闸门：只有远端分页完整结束、每条 Memo 转换成功、附件处理成功且所有本地写入成功后，才执行远端删除清理；任一步骤失败都会跳过删除阶段。
- 智能同步和增量同步仍是非破坏性的，不根据不完整快照删除历史 Memo。
- 强制同步使用远端当前正文精确覆盖插件管理的 Memo 块；本地附件实体文件仍保留，不因远端 Memo 删除而自动删除。
- 多账户若使用同一个 Daily Memo 标题，会自动禁用删除清理，防止一个账户误删另一个账户的记录；需要为各账户配置不同标题后才能启用完整镜像删除。

### 测试

- 新增远端删除回归测试，验证多条本地 Memo 缩减为远端唯一记录，同时保留 Memos 标题和非 Memos 日记内容。

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