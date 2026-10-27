> 📖 English documentation: [README.md](./README.md)

# 开物 Kaiwu

多租户的开发者作品空间。每个人开一个自己的空间，把项目摆进来；
懒得写介绍就贴一个 GitHub 地址，AI 读完仓库替你写好卡片。

线上参考的视觉与信息结构来自 [product.yao-yang.cn](https://product.yao-yang.cn/)，但这一版把「个人作品集」做成了「多租户平台 + AI 上架流水线」。

---

## 跑起来

```bash
npm install
npm run dev          # http://localhost:4310
```

首次进入是空的。想直接看到两个人的作品，另开一个终端：

```bash
npm run seed         # 需要 dev 正在运行
```

`seed` 会把 `RiemannChow/agent-hub` 与 `RiemannChow/nantianmen-ai-gateway`
真实跑一遍识别流水线后上架到 `@riemann` 空间。

## 配大模型（可选）

不配也能用 —— 会走内置的本地语义解析引擎。配了就走上游模型，文案更自然：

```bash
cp .env.example .env
# 填 LLM_API_KEY / LLM_BASE_URL / LLM_MODEL（任何 OpenAI 兼容端点）
```

同时建议配 `GITHUB_TOKEN`，否则 GitHub API 未认证限流 60 次/小时（一次识别约消耗 3-6 次）。

---

## 界面

| 首页 | 空间作品集 |
| --- | --- |
| ![首页](docs/screenshots/home.png) | ![空间](docs/screenshots/space.png) |

| 作品详情 | AI 上架 |
| --- | --- |
| ![详情](docs/screenshots/detail.png) | ![提交](docs/screenshots/submit.png) |

| 管理台 | Agent Card |
| --- | --- |
| ![管理台](docs/screenshots/studio.png) | ![AgentCard](docs/screenshots/agentcard.png) |

---

## 新增：三个创新方向

### 1. 宣称 vs 证据核对

详情页底部新增「核对」面板，把 README 里的**声称**与代码里的**证据**拆开比对：

- **有据** — README 写了、代码里也能找到（如 `package.json` 真有 `mcp` 依赖）
- **存疑** — README 写了、但代码里找不到对应痕迹
- **待补** — 代码里有证据、但 README 完全没提（如仓库里有 Dockerfile 但文档一字未说）

每个能力点附带证据出处（文件名或依赖路径），让用户一眼看出「AI 说我会 MCP」到底靠不靠谱。核对分数 `(有据×3 + 待补×2) / 理论满分` 直接打在卡片上。

实现上把分析拆成两路：`claimCorpus`（README + topics + description）与 `evidenceCorpus`（文件树 + 依赖清单），各跑一套命中规则后交叉比对。`lib/analyze/rules.ts` 里每个能力点都配了 `evidence` 字段，说明它该去哪里找证据。

### 2. 活的卡片（重扫 + 动态）

作品不是发布那一刻的快照。管理台每个卡片多了「重扫」按钮，点击后：

1. 重新跑一遍分析流水线（拉最新仓库信息，含最近提交列表）
2. 与上次扫描做结构化 diff（比提交、能力点、技术栈、star、许可，不比生成的中文文案）
3. 产出变更记录：`新提交`、`能力点新增 / 补上代码佐证`、`技术栈新增`、`Star 涨跌`……
4. 写入 `changelog`，详情页底部长出一条时间轴

其中「新提交」是最真实的信号 —— 它直接来自仓库的 commit 列表，而不是检测器对文案的重新解读；技术栈只报新增、不报移除，避免检测器排序波动被误读成「删掉了某个技术栈」。

![作品动态](docs/screenshots/detail-timeline.png)

这样卡片从「我做过什么」变成「我最近在做什么」，解决作品集「建完就死」的通病。

### 3. Agent Card — 一张给机器看的名片

`/riemann/agent-card` 把一个人的全部作品、能力点、技术栈压成一个结构化 JSON，字段习惯对齐 A2A AgentCard。同时暴露三个对外接口：

| 接口 | 说明 |
| --- | --- |
| `GET /api/agent-card/:handle` | 结构化 JSON（skills / links / endpoints） |
| `GET /api/search?q=...` | 按能力关键词搜人，支持 `&handle=` 限定空间 |
| `packages/mcp/server.mjs` | MCP Server，`search_portfolio` + `publish_project` 两个工具 |

任何兼容 MCP 的 agent 都能「查这个人会做什么」，也能「帮他把仓库上架」。人的作品集从此成为 agent 网络里的一个可发现节点。

---

## 新增：可信度与分发能力

在最初三个方向之上，又补了一层「让已有创新真正可信、可分发」的能力，按性价比分三档：

### 先做（地基）
- **证据锚点**：每条「有据」都带 GitHub permalink（锚定 commit sha），点开直达当时的代码 —— 把「信我」变成「你自己看」。
- **变更摘要**：重扫时把 commit 归纳成一句人话（feat/fix/docs 分组；配了 LLM 再润色），显示在作品动态顶部。
- **检测器快照测试**：`npm test` 用 `node:test` 覆盖技术栈优先级、宣称核对、diff 去噪，防止回归。

### 值得投入（差异化）
- **可验证 Agent Card**：Ed25519 对卡片做 detached signature，公钥暴露在 `/.well-known/kaiwu.json`；`npm run verify:card` 可离线验签。
- **追问式自证**：对「只有说法」的能力点自动生成追问，作者作答后沉淀为结构化自证，访客可见。
- **能力雷达 + JD 匹配**：跨作品聚合分类强度画雷达；贴一段 JD 算命中数与「有据率」。

### 顺手做（分发）
- **动态徽章**：`/api/badge/{handle}` 与 `/api/badge/{handle}/{slug}` 返回 SVG（核对分 + 颜色分档），随重扫更新。
- **一键导出 README**：`/api/export/{handle}` 生成带徽章的 Markdown，直接贴进 GitHub 主页。

| 能力雷达 + JD 匹配 | 追问式自证 |
| --- | --- |
| ![能力雷达](docs/screenshots/capability.png) | ![待自证](docs/screenshots/selfproof.png) |

| 作品动态（含摘要） | 可验证 Agent Card |
| --- | --- |
| ![作品动态](docs/screenshots/detail-timeline.png) | ![已签名](docs/screenshots/signed-card.png) |

---

## 这个站有什么

### 前台

| 路径 | 说明 |
| --- | --- |
| `/` | 首页：定位、精选作品、三步上架说明、空间列表 |
| `/explore` | 全部作品，按分类筛选 + 关键词搜索 |
| `/[handle]` | 某个空间的作品集，可按分类过滤 |
| `/[handle]/[slug]` | 作品详情：长文介绍、能力清单、技术栈、仓库/演示入口、**「这张卡片是怎么来的」信号回溯** |

### 后台

| 路径 | 说明 |
| --- | --- |
| `/join` | 开通空间（地址 + 显示名 + 可选口令）/ 登录已有空间 |
| `/submit` | **AI 上架**：贴 GitHub 地址 → 识别过程可视化 → 逐项可改 → 发布 |
| `/studio` | 空间管理台：作品上下架 / 编辑 / 删除，空间信息维护 |

### 多租户怎么隔离

- 一个 `tenant` = 一个空间 = 一个独立地址 + 一套作品 + 一个后台。
- 会话是 HMAC 签名的 httpOnly Cookie（`tenantId.hmac`），密钥自动生成在 `data/secret.key`。
- 口令用 `scrypt` 加盐存储；**留空口令的空间是演示空间**，任何人都能进它的后台 —— 本地演示够用，上线前请务必设口令或换成真正的账号体系。

---

## AI 上架是怎么实现的

`lib/analyze/` 是一条可解释的流水线，不是一次黑盒调用：

```
GitHub URL
  ↓ lib/github.ts        拉取 repo 元信息 / topics / languages / README / 文件树 / 依赖清单（全树扫描）/ 最近提交
  ↓ lib/analyze/heuristic.ts
      ① 清洗 README（剥徽章、图片、表格、代码块）
      ② 抽标题 / 首段 / 小标题 / 要点
      ③ 能力命中：30 组正则 → 中文能力短语 + 标签 + 权重
      ④ 分类打分：6 个分类的关键词权重表 → 取最高分
      ⑤ 技术栈：语言分布 + 清单文件 + 依赖内容三方交叉
  ↓ lib/analyze/llm.ts    （有 key 时）把上面的信号连同 README 交给模型，产出中文名/定位/简介/亮点
  ↓ Draft                → 前端逐项可编辑 → 发布
```

两个引擎的选择是显式的，卡片上会标注 `local-semantic` 或 `llm:<model>`；
点开详情页的「这张卡片是怎么来的」，能看到当时命中的能力点与分类打分。

**为什么保留规则引擎**：没有 key 也能用、结果可复现、失败可降级。
模型不可用时自动回退并给出提示，而不是直接报错。

### 批量导入

`POST /api/import` 接受 `{ tenant, repos: [{ url, polish }] }`，逐个跑流水线并上架。
`npm run seed` 就是它的调用方。生产环境需要 `x-kaiwu-token === KAIWU_SEED_TOKEN`。

---

## 代码结构

```
app/
  page.tsx                    首页
  explore/                    全部作品
  [tenant]/page.tsx           空间作品集
  [tenant]/[slug]/page.tsx    作品详情
  submit/                     提交上架（客户端交互全在这里）
  studio/                     空间管理台
  join/                       开通 / 登录
  api/
    analyze/                  POST 仓库地址 → Draft
    projects/                 作品 CRUD（需会话）
    projects/[id]/rescan      POST 重扫作品并生成 changelog
    tenants/                  空间信息更新
    auth/                     register / login / logout
    import/                   批量导入
    agent-card/[handle]       GET 结构化 Agent Card JSON
    search                    GET 按能力关键词检索
    match                     POST 按 JD 匹配能力
    badge/[handle]            GET 动态徽章 SVG（空间 / 单件作品）
    export/[handle]           GET 导出带徽章的 README
    projects/[id]/self-proof  POST 作者补充自证
    .well-known/kaiwu.json    GET Agent Card 验签公钥
components/
  cover-art.tsx               无截图时的「版画」封面（按 id 哈希的确定性构图）
  project-card.tsx  site-header.tsx  site-footer.tsx
lib/
  db.ts                       仓储层（当前是 JSON 文件，换库只改这一个文件）
  github.ts  session.ts  format.ts  types.ts
  analyze/                    rules.ts / heuristic.ts / llm.ts / index.ts
  diff.ts                     扫描 diff 与 changelog 生成
  agent-card.ts               Agent Card JSON 组装
  search.ts                   全文检索（内存过滤）
  sign.ts                     Agent Card 的 Ed25519 签名 / 验签
  summarize.ts                变更摘要（启发式 + 可选 LLM）
  capability.ts               能力聚合与 JD 匹配
  selfproof.ts                追问式自证
  badge.ts  export.ts         动态徽章 SVG / README 导出
packages/
  mcp/                        MCP Server（search_portfolio + publish_project）
tests/
  core.test.ts                检测器 / 核对 / diff 的快照测试（npm test）
scripts/
  verify-card.mjs             Agent Card 验签脚本（npm run verify:card）
data/
  kaiwu.json                  数据文件（已 gitignore）
  secret.key                  会话签名密钥（已 gitignore）
```

### 存储

当前用 `data/kaiwu.json` + 原子写入，零原生依赖，clone 下来就能跑。
所有读写都收在 `lib/db.ts`，要换 Postgres / Supabase 只替换这一层的实现，
上层页面与 API 不用动。

---

## 已知取舍 / 下一步

- **没有账号密码体系**：只有空间口令，够单机演示，不够多用户生产。
- **没有文件上传**：封面走 URL 或自动版画，还没做图片上传。
- **没有服务端搜索**：`/explore` 与 `/api/search` 的关键词搜索在内存里过滤，作品上千条后要换全文索引。
- **GitHub 限流**：未认证 60 次/小时，正式用请配 `GITHUB_TOKEN`。
- 下一步想做：作品详情页多图展示、空间自定义域名、`/api/import` 的进度推送（SSE）、作品访问统计。

## License

MIT
