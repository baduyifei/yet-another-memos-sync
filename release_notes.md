## 🎉 What's New in 1.6.4

### Critical fix

- Fixed repeated headings and memos when the configured `Today's Memos` heading used a straight apostrophe while historical templates used typographic `‘` or `’` characters.
- Heading comparison now normalizes common straight and typographic apostrophes.
- Numeric Memo block IDs such as `^1783037940` are now treated as unique keys across the entire Daily Note, not only inside the first matched section.
- Existing Memo IDs use insert-only backup semantics: retain and ignore instead of overwriting, appending another copy, or deleting during force sync.
- Force sync consolidates equivalent duplicate Memos sections and keeps only the first local backup for each duplicated ID.
- A Memo is not inserted again when its ID already exists elsewhere in the Daily Note, even if no matching Memos heading is found.

---

## 🎉 1.6.4 版本新功能

### 🚨 关键修复

- 修复 `Today's Memos` 标题使用直引号 `'`，而历史模板使用弯引号 `‘`/`’` 时，强制同步反复新增标题和 Memo 的严重重复问题。
- 标题匹配现在统一识别 ASCII 直引号和常见 Unicode 弯引号。
- 使用 Memo 的数字块 ID（例如 `^1783037940`）作为整篇 Daily Note 的唯一键，而不再只检查当前匹配到的标题区块。
- 同一个 Memo ID 已存在时直接保留并忽略云端同 ID 内容，不覆盖、不追加第二份，也不因强制同步而删除。
- 强制同步会自动合并等价的重复 Memos 标题区块；同一 ID 多次出现时只保留第一次出现的本地备份。
- 没有匹配标题但文件其他位置已经存在该 Memo ID 时，也不会再次创建备份。

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