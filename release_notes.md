## 🎉 What's New in 1.6.2

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

---

## 🎉 1.6.2 版本新功能

### 🎉 新增功能

- **Memos v0.21.0 完整兼容**：新增针对旧版 REST API 的专用兼容层，改用 `/api/v1/memo`，并适配 v0.21.0 的数组响应、`limit`/`offset` 分页与资源字段。
- **图片和附件本地备份**：同步时通过 `/o/r/{uid}` 下载 Memos 资源，并使用账户 Token 完成受保护资源的访问。
- **Obsidian 本地附件引用**：下载成功后，备忘录中的图片和附件链接自动指向 Obsidian 库内文件，避免只留下失效的远程地址。
- **自动补齐日记标题**：如果历史 Daily Note 缺少配置的 Memos 标题，且当天确实存在备忘录，插件会在文件末尾自动添加标题并写入内容。

### 🔧 修复问题

- 修复上游新版 API 路径 `/api/v1/memos` 在 Memos v0.21.0 返回 HTTP 404、导致完全无法同步的问题。
- 修复 v0.21.0 不支持 CEL 服务端过滤和 `pageToken` 分页所造成的历史备忘录遗漏。
- 修复仅生成附件文件名、但没有下载真实图片文件而导致 Obsidian 显示“找不到图片”的问题。
- 修复历史日记没有预置标题时，强制同步显示完成但内容无法写入的问题。
- 防止没有备忘录的日期被添加空标题，并防止重复创建同名标题。

### 📈 改进

- 增量时间过滤改为客户端处理，兼容 Memos v0.21.0，同时保留智能同步和强制同步行为。
- 附件下载支持自动创建目录、跳过已存在文件、处理重复文件名，并阻止把私有 Token 发送到外部域名。
- README 重写为本 Fork 的完整安装、配置、历史同步、附件备份、故障排查和开发说明。
- 新增 `NOTICE.md`，清晰记录上游来源、修改范围与版权归属。

### 💥 兼容性说明

- 本版本是专门面向 **Memos v0.21.0** 的兼容 Fork，不建议直接用于仅支持新版 `/api/v1/memos` 接口的 Memos 实例。
- 插件 ID 与上游相同，安装本 Fork 前应先停用上游版本，不能同时启用两个版本。

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