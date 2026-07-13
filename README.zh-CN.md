# Yet Another Memos Sync — Memos v0.21 兼容版

将自托管 **Memos v0.21.0** 中的备忘录、图片和附件同步到 Obsidian Daily Notes。

> [!IMPORTANT]
> 这是 [exusiaiwei/yet-another-memos-sync](https://github.com/exusiaiwei/yet-another-memos-sync) 的个人维护 Fork，基于上游 `1.6.1` 修改，专门解决 Memos v0.21.0 与当前社区版 API 不兼容的问题。本 Fork 固定适配 v0.21.x，不以现代 Memos API 为目标。

**简体中文** · [English](./README.md) · [版本发布](https://github.com/baduyifei/yet-another-memos-sync/releases) · [问题反馈](https://github.com/baduyifei/yet-another-memos-sync/issues)

## 目录

- [为什么需要这个 Fork](#为什么需要这个-fork)
- [本 Fork 完成的修改](#本-fork-完成的修改)
- [同步后的目录和格式](#同步后的目录和格式)
- [安装](#安装)
- [配置](#配置)
- [首次同步与历史数据补录](#首次同步与历史数据补录)
- [同步天数的计算方式](#同步天数的计算方式)
- [图片与附件备份](#图片与附件备份)
- [命令说明](#命令说明)
- [常见问题](#常见问题)
- [隐私与安全](#隐私与安全)
- [开发与构建](#开发与构建)
- [版权、许可证与致谢](#版权许可证与致谢)

## 为什么需要这个 Fork

Memos v0.21.0 与新版本 API 的路由、分页参数、响应结构和附件字段均不同：

| 项目 | Memos v0.21.0 | 现代 API / 上游 1.6.1 的预期 |
| --- | --- | --- |
| 列表路由 | `/api/v1/memo` | `/api/v1/memos` |
| 分页方式 | `limit` + `offset` | `pageSize` + `pageToken` |
| 返回结构 | JSON 数组 | `{ memos, nextPageToken }` |
| 时间过滤 | 不支持 `created_ts` CEL 查询 | 服务端 CEL 过滤 |
| 资源字段 | `resourceList` | `attachments` / `resources` |
| 内部资源下载 | `/o/r/{resource.uid}` | 新版资源接口 |

上游 1.6.1 固定请求 `/api/v1/memos`，连接 v0.21.0 时会收到 `HTTP 404 Not Found`。本 Fork 对客户端、分页器、资源下载和 Daily Note 写入流程进行了完整适配。

## 本 Fork 完成的修改

### 1. Memos v0.21.0 API 完整适配

- 将备忘录列表请求切换到 `/api/v1/memo`。
- 使用 v0.21 的 `limit`、`offset` 分页。
- 将旧版 JSON 数组转换为插件内部统一的分页结构。
- 持续翻页直至返回不足一页，避免只同步第一页。
- 读取 v0.21 的 `createdTs`、`resourceList` 等字段。
- 移除旧服务器不支持的 `created_ts > ...` CEL 请求。
- 在 Obsidian 客户端本地执行“同步天数”和“上次同步时间”过滤。
- 保留智能同步、增量同步和强制同步三种模式。

### 2. 图片和附件自动备份

- 从每条 Memo 的 `resourceList` 读取附件。
- 内部资源通过 `/o/r/{resource.uid}` 下载。
- 私有资源下载自动携带该账户的 Bearer Token。
- 外部链接资源也会尝试复制到本地，但绝不会把 Memos Token 发送给第三方域名。
- 自动创建设置中指定的附件目录。
- 文件名使用 `{resource.id}-{原文件名}`，例如 `996-image.png`，降低重名风险。
- 已存在的同名文件自动跳过，避免反复下载。
- 下载成功后写入库内引用，例如：

  ```markdown
  ![[Attachments/996-image.png]]
  ```

- “跳过图片”开启时，不下载也不写入图片资源。

### 3. 历史 Daily Note 自动补标题

旧 Daily Note 可能没有配置的 Memos 标题。上游逻辑遇到缺失标题会直接跳过写入，但仍显示同步完成。

本 Fork 修改为：

- 标题存在：更新该标题下的 Memos。
- 标题不存在且当天有 Memos：在文件最底部追加标题，再写入当天内容。
- 标题不存在且当天没有 Memos：不修改文件，不创建空标题。
- 重复强制同步不会重复添加同名标题。
- 原有 Daily 内容、属性、Timelog、Bases 等区域保持不变。

### 4. 永久 UID 全库唯一与重复自动修复

- 每条 Memo 使用 Memos API 的永久 UID，例如 `^3gb9Yv9UB8nurg42kKtm3V`。
- 在 Memos v0.21.0 的 `/api/v1/memo` 响应中，这个永久 UID 位于 `name` 字段；插件会把它直接作为块 ID。
- UID 不随正文、创建时间或日期修改而改变。
- 同步前检查全部 Daily Notes，而不是只检查当前标题或当前日期文件。
- UID 已存在且日期相同：原地更新为 Memos 当前正文、时间、Callout 和附件引用，不追加第二份。
- UID 已存在但远端日期改变：先写入新的目标 Daily Note，成功后从旧日期删除该 Memo 块。
- UID 不存在：在远端当前日期对应的 Memos 标题下创建一次备份。
- `Today's Memos`、`Today‘s Memos` 和 `Today’s Memos` 会被识别为同一个标题。
- 历史 `^时间戳` 块会在可确认对应关系时原地迁移为 `^UID`。
- 1.6.5 曾错误生成的 `^memos-{数字ID}` 也会原地迁移为正确 UID。
- 如果历史文件已有多个等价标题或重复身份，下一次强制同步会合并为一个标题、一个 Memo。
- 旧日期只删除被移动的 Memo，其他日记内容和标题全部保留；附件文件不会随移动删除。

### 5. Memos 权威镜像（包含远端删除）

“强制同步所有备忘录”以 Memos 服务器当前状态为准，使插件管理的 Memo 区块成为远端镜像：

- 远端新增：在对应日期创建本地 Memo 块。
- 远端修改：按永久 UID 更新正文、时间、Callout 和附件引用。
- 远端改日期：先写入新日期，成功后从旧日期删除同 UID 块。
- 远端删除：从 Obsidian 的 Memos 标题区块删除同 UID 块。

这不是 Obsidian 向 Memos 回写的“双向编辑”，而是 **Memos → Obsidian 的单向权威镜像**。强制同步会覆盖插件管理区块里的本地手工修改。为避免误删，插件只有在完整读取全部远端分页并成功完成所有本地写入后才执行删除；任何 API、附件或文件错误都会跳过删除阶段。物理附件文件采用安全保留策略，不会自动删除。

> [!WARNING]
> 多账户必须使用不同的“日记备忘录标题”。如果两个已启用账户使用相同标题，插件会禁用远端删除清理，防止账户之间互相误删。

升级到 UID 版本后的首次操作：

1. 执行一次“强制同步所有备忘录”（该命令会自动读取全部历史）。
2. 检查历史 Memo 的块 ID 已由 `^数字时间戳` 变为 `^UID`。

这一步应在继续批量修改历史 Memo 时间之前完成。已经在迁移前改过时间、且旧时间戳无法对应的历史记录，需要人工确认一次。

示例：配置标题为 `## Today's Memos` 时，文件会写入：

```markdown
## Today's Memos

> [!info] 🌅 08:30 - 早晨
> 一条来自 Memos 的内容
>
> ^3gb9Yv9UB8nurg42kKtm3V
```

### 6. 其他保留能力

- 多账户 / 多实例配置。
- 标准列表、Callout、List Callout 三种格式。
- 时间段 Emoji。
- 本地待办完成状态保护。
- 启动同步和定时同步。
- 同步状态保存在插件 `data.json` 中。

## 同步后的目录和格式

Daily Note 的实际目录由 Obsidian 核心插件 **日记** 决定。例如：

```text
Notes/Daily/2026-07-12.md
```

图片和附件保存到插件的“附件文件夹”设置，例如：

```text
Attachments/996-image.png
Attachments/995-example.jpeg
```

插件不会把所有 Memos 汇总成一个单独 Markdown 文件；每条 Memo 会按照 `createdTs` 写入对应日期的 Daily Note。

## 安装

### 方法一：从 Releases 手动安装

1. 打开本仓库的 [Releases](https://github.com/baduyifei/yet-another-memos-sync/releases)。
2. 下载同一版本的：
   - `main.js`
   - `manifest.json`
   - `styles.css`
3. 放入：

   ```text
   <Vault>/.obsidian/plugins/yet-another-memos-sync/
   ```

4. 如果从上游社区版替换而来，请保留原来的 `data.json`，这样可以继续使用现有账户、Token 和同步设置。
5. 完全退出并重新打开 Obsidian。
6. 在 **设置 → 第三方插件** 中启用插件。

> [!WARNING]
> 本 Fork 与上游插件使用相同插件 ID `yet-another-memos-sync`，属于替换安装，不能与社区版并行启用。社区插件更新也可能覆盖本 Fork，建议使用 BRAT 固定到本仓库或关闭对该插件的社区版更新。

### 方法二：BRAT

1. 安装并启用 BRAT。
2. 打开 **BRAT → Add Beta Plugin**。
3. 输入：

   ```text
   https://github.com/baduyifei/yet-another-memos-sync
   ```

4. 安装完成后重新加载 Obsidian。

## 配置

进入 **设置 → Yet Another Memos Sync v0.21**，至少配置以下项目：

| 设置 | 建议值 | 说明 |
| --- | --- | --- |
| Memos API URL | `https://your-memos.example.com` | 只填写服务器根地址，不要附加 `/api/v1/memo` |
| API 令牌 | Memos Access Token | 从 Memos 账户设置创建 |
| 日记备忘录标题 | `## Today's Memos` | 新建账户的默认标题；必须与希望写入的 Markdown 标题一致 |
| 同步天数限制 | `30` | 用于智能/增量同步；强制镜像同步会忽略此值并读取全部历史 |
| 自动创建缺失日记 | 开启 | 没有对应日期文件时使用 Daily Note 模板创建 |
| 附件文件夹 | `Attachments` | 新安装的默认目录；区分大小写，建议与 Obsidian 附件目录一致 |
| 使用 Callout 格式 | 开启 | 新安装时默认勾选，以 Callout 代码块样式写入 Memos |
| 跳过图片 | 关闭 | 开启后不会备份图片 |

## 首次同步与历史数据补录

### 首次使用

1. 确认 Obsidian 核心插件 **日记** 已启用。
2. 确认 Daily Note 文件夹和模板配置正确。
3. 配置服务器地址与 Token。
4. 如需非破坏性试运行，先使用“智能同步备忘录”并检查结果。
5. 确认后执行 **强制同步所有备忘录**，建立完整镜像。
6. 检查 Daily Note 和附件目录。

### 补录历史数据

1. 确认服务器地址、Token 和标题设置正确；强制同步会自动处理全部历史 Memos。
2. 执行 **强制同步所有备忘录**。
3. 插件会按日期打开或创建 Daily Note。
4. 历史文件缺少标题时，会自动在文件末尾补标题并写入内容。

普通智能同步会使用上次同步时间，不适合重新处理旧数据。修改标题、同步天数、格式或附件逻辑后，应执行一次强制同步。

## 同步天数的计算方式

同步天数是从当前时间向前计算的自然时间范围，不是“最近有内容的 N 天”。它只约束智能同步和增量同步；为了安全判断远端删除，**强制同步会忽略此限制并拉取全部历史**。

例如当前日期为 7 月 12 日：

- 设置 `7`：截止时间约为 7 月 5 日 00:00，7 月 3 日不会同步。
- 设置 `10`：可覆盖 7 月 3 日。
- 设置 `30`：覆盖最近30天。
- 设置 `0`：不设时间限制。

改变天数后会影响后续智能/增量同步范围。执行强制同步时无须改成 `0`。

## 图片与附件备份

图片同步流程：

```text
Memo.resourceList
        ↓
读取 resource.uid / filename / type
        ↓
GET /o/r/{uid}（私有资源携带 Token）
        ↓
保存到 Obsidian 附件文件夹
        ↓
在 Daily Note 写入库内嵌入链接
```

如果图片没有显示，请依次检查：

1. “跳过图片”是否关闭。
2. “附件文件夹”是否与库内目录大小写一致。
3. 附件目录中是否出现 `{id}-{filename}` 文件。
4. Markdown 是否引用正确的库内路径。
5. Token 是否仍有权限读取私有 Memo 的资源。

## 命令说明

| 命令 | 行为 |
| --- | --- |
| 智能同步备忘录 | 第一次完整同步，之后按上次时间增量同步 |
| 增量同步备忘录 | 只处理比上次同步时间更新的内容 |
| 强制同步所有备忘录 | 忽略天数限制，拉取全部远端状态；按 UID 创建、更新、跨日移动，并删除远端已不存在的本地 Memo 块 |
| 打开设置 | 打开插件设置页 |

强制同步只修改 Memos 管理的标题区块；历史日记的其他内容会保留。同 UID 的正文和时间会更新到远端当前状态，日期变化时从旧 Daily Note 移动到新 Daily Note，远端删除时本地块也会删除，全库最终与 Memos 当前状态一致。下载过的附件文件继续保留。

## 常见问题

### Memos 已删除，但 Obsidian 仍然存在

升级到 1.6.8 或更高版本后执行“强制同步所有备忘录”。智能/增量同步不会执行删除。如果多个账户使用相同标题，请先为每个账户配置不同标题，否则安全机制会禁用删除清理。

### HTTP 404 Not Found

确认正在使用本 Fork。上游 1.6.1 请求 `/api/v1/memos`，Memos v0.21.0 的正确路由是 `/api/v1/memo`。

### 显示“同步完成”，但 Daily Note 没有内容

旧版插件在找不到标题时会跳过写入。本 Fork 会自动补标题。安装新版本后执行一次强制同步。

### 某个较早日期没有同步

检查该日期是否超出“同步天数限制”。增加天数或设置为 `0`，然后强制同步。

### 显示“找不到 996-image.png”

说明 Markdown 有图片引用，但图片没有实际下载。确认安装了包含资源下载器的本 Fork、关闭“跳过图片”，然后强制同步。

### 普通同步没有重新处理历史 Memo

这是增量同步的预期行为。请选择“强制同步所有备忘录”。

## 隐私与安全

- 插件仅连接用户配置的 Memos 地址及 Memo 中明确包含的外部资源地址。
- Memos Token 仅发送给配置的 Memos 服务器。
- 下载外部链接资源时不会附带 Memos Token。
- 不包含遥测、统计或第三方分析。
- Memo 内容和附件写入本地 Obsidian Vault。
- `data.json` 含有 Token，已被 `.gitignore` 排除，禁止提交到公开仓库。

## 开发与构建

```bash
git clone https://github.com/baduyifei/yet-another-memos-sync.git
cd yet-another-memos-sync
npm install
npm run lint
npm run build
```

生产构建会在项目根目录生成 `main.js`。发布所需文件为：

```text
main.js
manifest.json
styles.css
```

本 Fork 的主要修改文件：

```text
src/api/memosClient.ts
src/api/memosPaginator.ts
src/services/dailyNoteManager.ts
src/services/resourceDownloader.ts
src/types/index.ts
src/utils/dailyNoteModifier.ts
src/utils/memoTransformer.ts
```

## 版权、许可证与致谢

本 Fork 基于：

- [exusiaiwei/yet-another-memos-sync](https://github.com/exusiaiwei/yet-another-memos-sync)，上游版本 1.6.1。
- [RyoJerryYu/obsidian-memos-sync](https://github.com/RyoJerryYu/obsidian-memos-sync)，上游项目致谢的早期灵感来源。
- [Memos](https://github.com/usememos/memos)。
- [Obsidian](https://obsidian.md/) 及 Obsidian 示例插件代码。

版权说明：

- 上游代码及其历史贡献的版权归各原作者和贡献者所有。
- `Copyright © 2026 baduyifei` 仅适用于本 Fork 新增或修改的部分，包括 Memos v0.21.0 适配、旧版分页、本地时间过滤、附件下载、库内图片引用、自动补标题、永久 UID 去重、跨日移动和远端权威镜像逻辑。
- Memos、Obsidian、List Callouts 及相关名称、商标和项目归各自权利人所有。
- 本 Fork 不宣称拥有任何上游代码或第三方项目的独占版权。

分发和使用遵守仓库现有 [LICENSE](./LICENSE) 文件。详细来源与修改版权说明见 [NOTICE.md](./NOTICE.md)。
