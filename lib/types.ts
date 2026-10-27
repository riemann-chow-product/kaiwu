export type ProjectStatus = 'published' | 'draft' | 'archived'

export interface Tenant {
  id: string
  handle: string
  name: string
  title: string
  bio: string
  glyph: string
  accent: string
  github: string | null
  website: string | null
  passHash: string | null
  createdAt: number
}

/* ----------------------------- 宣称 vs 证据 ----------------------------- */

export type Verdict = 'verified' | 'claimed-only' | 'evidence-only' | 'unverifiable'

export interface AuditItem {
  label: string
  tag: string
  /** 证据来源的可读描述，例如 "Dockerfile" 或 "package.json → @modelcontextprotocol/sdk" */
  proof?: string
  /** 可点击的证据锚点：GitHub blob permalink（带 commit sha，可精确回溯到当时的代码） */
  proofUrl?: string
}

export interface Audit {
  verified: AuditItem[]
  /** 说了，但在代码里找不到对应痕迹 */
  claimedOnly: AuditItem[]
  /** 做到了但没写进 README —— 可以补进文案 */
  evidenceOnly: AuditItem[]
  /** 这类能力只能靠人判断，机器不下结论 */
  unverifiable: AuditItem[]
  /** 可信度：verified / (verified + claimedOnly)，无样本时为 null */
  score: number | null
  summary: string
  suggestions: string[]
}

/* ------------------------------- 变更记录 ------------------------------- */

export type ChangeType =
  | 'capability_added'
  | 'capability_removed'
  | 'capability_verified'
  | 'stack_added'
  | 'stack_removed'
  | 'stars'
  | 'archived'
  | 'license'
  | 'commit'

export interface ChangeEntry {
  at: number
  type: ChangeType
  text: string
  /** 提交类变更对应的 commit sha，可跳转到 GitHub */
  sha?: string
}

/** 作者对「只有说法、缺代码佐证」的能力点做出的补充说明 */
export interface SelfProof {
  tag: string
  label: string
  question: string
  answer: string
  at: number
}

/* -------------------------------- 作品 -------------------------------- */

export interface Project {
  id: string
  tenantId: string
  slug: string
  name: string
  nameEn: string | null
  tagline: string
  summary: string
  highlights: string[]
  tags: string[]
  stack: string[]
  category: string
  repoUrl: string | null
  demoUrl: string | null
  cover: string | null
  glyph: string
  accent: string
  status: ProjectStatus
  featured: number
  source: 'manual' | 'github-ai'
  engine: string | null
  signals: AnalysisSignals | null
  stars: number | null
  license: string | null
  language: string | null
  /** 每次重扫产生的差异，形成「作品动态」 */
  changelog?: ChangeEntry[]
  /** 一句话进展摘要（LLM 或启发式生成），展示在作品动态顶部 */
  changeSummary?: string
  /** 作者对「只有说法」的能力点的补充自证 */
  selfProofs?: SelfProof[]
  /** 上次重扫时间 */
  lastScanAt?: number | null
  publishedAt: number
  updatedAt: number
}

/** 分析过程中采集到的原始信号，用于在前端展示「AI 到底看到了什么」 */
export interface AnalysisSignals {
  repo: string
  language: string | null
  languages: Record<string, number>
  stars: number | null
  forks: number | null
  license: string | null
  topics: string[]
  manifests: string[]
  dirs: string[]
  /** 仓库文件总数（用于展示扫描规模） */
  fileCount: number
  /** 机器识别到的技术栈。与卡片上人工确认过的 stack 分开存，重扫不会覆盖作者定稿 */
  detectedStack?: string[]
  /** 最近一次扫描时仓库的 HEAD commit，用于识别「新增了哪些提交」 */
  lastCommitSha?: string
  /** 最近提交的摘要（sha + 标题 + 时间），用于生成作品动态 */
  recentCommits?: { sha: string; date: string; message: string }[]
  readmeChars: number
  keywordHits: { label: string; weight: number }[]
  categoryScores: { category: string; score: number }[]
  /** 宣称 vs 证据的核对结果 */
  audit?: Audit
  engine: string
  notes: string[]
}

export interface Draft {
  name: string
  nameEn: string | null
  tagline: string
  summary: string
  highlights: string[]
  tags: string[]
  stack: string[]
  category: string
  glyph: string
  accent: string
  repoUrl: string | null
  demoUrl: string | null
  stars: number | null
  license: string | null
  language: string | null
  signals: AnalysisSignals
}

export interface TenantWithProjects extends Tenant {
  projects: Project[]
}
