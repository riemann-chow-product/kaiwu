import { CAPABILITIES, PROOF, CATEGORIES, LANG_LABEL, GLYPHS, ACCENTS, type CategoryRule } from './rules'
import type { AnalysisSignals, Audit, AuditItem, Draft } from '../types'
import type { RepoInfo } from '../github'

/* ----------------------------- README 清洗 ----------------------------- */

const stripHtmlBlocks = (s: string) =>
  s
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<table[\s\S]*?<\/table>/gi, '')
    .replace(/<div[\s\S]*?<\/div>/gi, '')
    .replace(/<p[^>]*>[\s\S]*?<\/p>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')

const stripBadgesAndImages = (s: string) =>
  s
    .replace(/\[!\[[^\]]*\]\([^)]*\)\]\([^)]*\)/g, '')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]*)\]\((?:[^)]*)\)/g, '$1')

const isNoise = (line: string) => {
  const t = line.trim()
  if (!t) return true
  if (t.length < 8) return true
  if (/^(\||-{3,}|={3,}|英文|english|日本語|繁體|简体|中文|readme)/i.test(t)) return true
  if ((t.match(/\|/g) || []).length >= 2) return true
  if (/^[^\p{L}\p{N}]+$/u.test(t)) return true
  return false
}

const chineseRatio = (s: string) => {
  const cn = (s.match(/[\u4e00-\u9fa5]/g) || []).length
  const total = (s.match(/[\p{L}\p{N}]/gu) || []).length || 1
  return cn / total
}

export interface ParsedReadme {
  title: string | null
  paragraphs: string[]
  headings: string[]
  bullets: string[]
  clean: string
}

export function parseReadme(raw: string): ParsedReadme {
  const withoutFences = raw.replace(/```[\s\S]*?```/g, '\n')
  const clean = stripBadgesAndImages(stripHtmlBlocks(withoutFences))

  const headings: string[] = []
  const paragraphs: string[] = []
  const bullets: string[] = []
  let title: string | null = null

  for (const line of clean.split('\n')) {
    const t = line.trim()
    const h = t.match(/^(#{1,6})\s+(.*)$/)
    if (h) {
      const level = h[1].length
      const text = h[2].replace(/[*_`]/g, '').trim()
      if (level === 1 && !title) title = text
      else if (text.length >= 2) headings.push(text)
      continue
    }
    const b = t.match(/^[-*+]\s+(.*)$/)
    if (b) {
      const text = b[1].replace(/[*_`]/g, '').trim()
      if (!isNoise(text) && text.length <= 160) bullets.push(text)
      continue
    }
    if (!isNoise(t)) paragraphs.push(t.replace(/[*_`]/g, '').trim())
  }

  return { title, paragraphs, headings, bullets, clean }
}

/* ----------------------------- 技术栈识别 ----------------------------- */

const MANIFEST_RULES: { file: RegExp; stack: string }[] = [
  { file: /(^|\/)pom\.xml$/i, stack: 'Maven' },
  { file: /(^|\/)build\.gradle(\.kts)?$/i, stack: 'Gradle' },
  { file: /(^|\/)package\.json$/i, stack: 'Node.js' },
  { file: /(^|\/)pnpm-lock\.yaml$/i, stack: 'pnpm' },
  { file: /(^|\/)go\.mod$/i, stack: 'Go Modules' },
  { file: /(^|\/)Cargo\.toml$/i, stack: 'Cargo' },
  { file: /(^|\/)requirements\.txt$/i, stack: 'Python' },
  { file: /(^|\/)pyproject\.toml$/i, stack: 'Python' },
  { file: /(^|\/)docker-compose[^/]*\.ya?ml$/i, stack: 'Docker Compose' },
  { file: /(^|\/)Dockerfile$/i, stack: 'Docker' },
  { file: /(^|\/)Makefile$/i, stack: 'Make' },
  { file: /(^|\/)vite\.config\./i, stack: 'Vite' },
  { file: /(^|\/)next\.config\./i, stack: 'Next.js' },
  { file: /(^|\/)tsconfig\.json$/i, stack: 'TypeScript' },
]

const CONTENT_HINTS: { match: RegExp; stack: string }[] = [
  { match: /io\.agentscope/i, stack: 'AgentScope' },
  { match: /webflux|reactor-core/i, stack: 'WebFlux' },
  { match: /spring-boot-starter/i, stack: 'Spring Boot' },
  { match: /spring-cloud|nacos/i, stack: 'Spring Cloud' },
  { match: /gin-gonic\/gin/i, stack: 'Gin' },
  { match: /gorm\.io/i, stack: 'GORM' },
  { match: /"react"\s*:/i, stack: 'React' },
  { match: /"antd"|ant-design/i, stack: 'Ant Design' },
  { match: /"tailwindcss"/i, stack: 'Tailwind CSS' },
  { match: /"vue"\s*:/i, stack: 'Vue' },
  { match: /neo4j/i, stack: 'Neo4j' },
  { match: /mongodb|mongo-driver/i, stack: 'MongoDB' },
  { match: /oceanbase|seekdb/i, stack: 'OceanBase' },
  { match: /sqlite/i, stack: 'SQLite' },
]

/**
 * 识别技术栈。
 *
 * 顺序很关键：先看**依赖清单里的内容**（最具体的证据），
 * 再看根目录的清单**文件名**（粗粒度，只说明构建方式），
 * 最后才是**语言分布**（最粗，但也最能代表项目主体）。
 *
 * 反过来做会出事：语言只有两种、文件名规则有十几条，
 * 若把它们排在前面，6 个名额会被「Java + Maven + Docker Compose」这类
 * 描述性词汇占满，真正的框架（AgentScope / WebFlux / GORM）一个都挤不进来。
 */
export function detectStack(
  info: RepoInfo,
  manifests: Record<string, string>,
  deployFiles: string[] = [],
): string[] {
  const out: string[] = []
  const push = (s: string) => {
    if (s && !out.includes(s) && out.length < 8) out.push(s)
  }

  // ① 依赖内容里的框架 —— 最具体，先占位
  const blob = Object.values(manifests).join('\n')
  for (const hint of CONTENT_HINTS) {
    if (hint.match.test(blob)) push(hint.stack)
  }

  // ② 构建方式（清单文件名）。用完整文件树，这样 frontend/package.json 也能算上
  for (const f of [...info.files, ...deployFiles]) {
    for (const rule of MANIFEST_RULES) {
      if (rule.file.test(f)) push(rule.stack)
    }
  }

  // ③ 语言分布 —— 排在最后，保证框架优先
  const langs = Object.entries(info.languages || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([k]) => LANG_LABEL[k] || k)
  langs.forEach(push)

  return out.slice(0, 6)
}

/* ----------------------------- 能力与分类 ----------------------------- */

const fresh = (re: RegExp, flags = 'i') => new RegExp(re.source, flags)

export function detectCapabilities(text: string) {
  return CAPABILITIES.map((c) => ({
    cap: c,
    hits: (text.match(fresh(c.re, 'gi')) || []).length,
  }))
    .filter((x) => x.hits > 0)
    .map((x) => ({ label: x.cap.label, tag: x.cap.tag, score: x.cap.weight * Math.min(x.hits, 3) }))
    .sort((a, b) => b.score - a.score)
}

const DOC_EXT = /\.(md|markdown|txt|rst|png|jpe?g|gif|svg|html?|pdf)$/i

/**
 * 在一组路径里挑最有说服力的一条。
 * 规则：跳过隐藏文件（.eslintignore 这种），文档与图片降权，优先层级浅、名字短的代码文件。
 */
function bestPath(paths: string[], re: RegExp): string | null {
  const scored: { path: string; score: number }[] = []

  for (const p of paths) {
    if (!re.test(p)) continue
    const segments = p.split('/')
    const base = segments[segments.length - 1]
    if (base.startsWith('.')) continue
    const isDoc = DOC_EXT.test(base) || /^(readme|changelog|license|contributing)/i.test(base)
    const score = segments.length * 10 + (isDoc ? 60 : 0) + p.length / 100
    scored.push({ path: p, score })
  }

  if (!scored.length) return null
  scored.sort((a, b) => a.score - b.score)
  return scored[0].path
}

/** 在文件树与依赖清单里找这个能力点的痕迹，返回可读证据 */
export function findProof(tag: string, files: string[], manifests: Record<string, string>): string | null {
  const rule = PROOF[tag]
  if (!rule) return null

  if (rule.pathAll) {
    const found = rule.pathAll.map((re) => bestPath(files, re))
    if (found.every(Boolean)) return found[0] ?? null
    return null
  }

  if (rule.path) {
    const p = bestPath(files, rule.path)
    if (p) return p
  }

  if (rule.dep) {
    for (const [name, content] of Object.entries(manifests)) {
      const m = content.match(fresh(rule.dep))
      if (m) return `${name} → ${m[0].slice(0, 32)}`
    }
  }
  return null
}

/** 把证据路径转成 GitHub permalink（锚定到当时的 commit，可点开直达代码） */
function proofPermalink(info: RepoInfo, proof?: string): string | undefined {
  if (!proof) return undefined
  const sha = info.commits?.[0]?.sha
  if (!sha) return undefined
  const raw = proof.includes(' → ') ? proof.split(' → ')[0].trim() : proof.trim()
  if (!raw) return undefined
  const looksLikePath =
    raw.includes('/') ||
    /\.[a-z0-9]{1,8}$/i.test(raw) ||
    /^(Dockerfile|Makefile|Jenkinsfile|LICENSE|COPYING|Procfile|Gemfile|Rakefile)$/i.test(raw)
  if (!looksLikePath) return undefined
  const encoded = raw.split('/').map(encodeURIComponent).join('/')
  return `https://github.com/${info.fullName}/blob/${sha}/${encoded}`
}

/**
 * 宣称 vs 证据：把「它说自己有什么」和「它真有什么」分开算。
 *
 * - 两边都有       → verified   有据可查
 * - 只有宣称       → claimed-only（结构可验证的能力）或 unverifiable（只能靠人判断的）
 * - 只有证据       → evidence-only，反过来提醒作者「你做到了但没写」
 */
export function auditClaims(
  claimCorpus: string,
  files: string[],
  manifests: Record<string, string>,
): Audit {
  const verified: AuditItem[] = []
  const claimedOnly: AuditItem[] = []
  const evidenceOnly: AuditItem[] = []
  const unverifiable: AuditItem[] = []

  for (const cap of CAPABILITIES) {
    const claimed = cap.re.test(claimCorpus)
    const proof = cap.evidence === 'structural' ? findProof(cap.tag, files, manifests) : null

    if (claimed && proof) verified.push({ label: cap.label, tag: cap.tag, proof })
    else if (claimed && cap.evidence === 'semantic') unverifiable.push({ label: cap.label, tag: cap.tag })
    else if (claimed) claimedOnly.push({ label: cap.label, tag: cap.tag })
    else if (proof) evidenceOnly.push({ label: cap.label, tag: cap.tag, proof })
  }

  const denom = verified.length + claimedOnly.length
  const score = denom > 0 ? Math.round((verified.length / denom) * 100) : null

  const parts: string[] = []
  if (verified.length) parts.push(`${verified.length} 个能力点在代码里有对应痕迹`)
  if (claimedOnly.length) parts.push(`${claimedOnly.length} 个只有说法、找不到证据`)
  if (evidenceOnly.length) parts.push(`${evidenceOnly.length} 个做到了却没写进文案`)

  const suggestions = evidenceOnly.map(
    (e) => `「${e.label}」在 ${e.proof} 里能找到依据，但文案没提 —— 可以补上。`,
  )

  return {
    verified,
    claimedOnly,
    evidenceOnly,
    unverifiable,
    score,
    summary: parts.length ? parts.join('，') + '。' : '没有足够信号做核对。',
    suggestions,
  }
}

export function classify(
  text: string,
  repoName: string,
): { category: CategoryRule; scores: { category: string; score: number }[] } {
  const hay = `${text}\n${repoName.replace(/[-_]/g, ' ')}`
  const scores = CATEGORIES.map((cat) => ({
    category: cat.name,
    score: cat.cues.reduce((sum, cue) => {
      const hits = (hay.match(fresh(cue.re, 'gi')) || []).length
      return sum + (hits > 0 ? cue.weight * Math.min(hits, 2) : 0)
    }, 0),
  })).sort((a, b) => b.score - a.score)

  const best = CATEGORIES.find((c) => c.name === scores[0].category) ?? CATEGORIES[3]
  return { category: scores[0].score > 0 ? best : CATEGORIES[3], scores }
}

/* ----------------------------- 主流程 ----------------------------- */

const TAILS: Record<string, string> = {
  'AI 基础设施': '，一个入口统一管住',
  智能体: '，跑成一个真能用的智能体',
  '检索与数据': '，让结果既准又可解释',
  开发工具: '，装好就能顺手用',
  效率工具: '，融进每天的动线里',
  前端与界面: '，观感与工程两头都要',
}

const clamp = (s: string, n: number) => (s.length <= n ? s : s.slice(0, n - 1).trimEnd() + '…')

export function heuristicAnalyze(
  info: RepoInfo,
  manifests: Record<string, string>,
  deployFiles: string[] = [],
): Draft {
  const parsed = parseReadme(info.readme)

  // 宣称语料：README + 仓库描述 + topics
  const claimCorpus = [info.readme, info.description ?? '', info.topics.join(' ')].join('\n')
  // 证据语料：文件树 + 依赖清单 + 语言分布
  const evidenceCorpus = [info.files.join('\n'), Object.values(manifests).join('\n'), Object.keys(info.languages).join(' ')].join('\n')
  const fullCorpus = `${claimCorpus}\n${evidenceCorpus}`

  const caps = detectCapabilities(claimCorpus)
  const audit = auditClaims(claimCorpus, info.files, manifests)
  // 给每条证据补上可点击的 GitHub 锚点（verified / evidenceOnly 才有 proof）
  for (const item of [...audit.verified, ...audit.evidenceOnly]) {
    item.proofUrl = proofPermalink(info, item.proof)
  }
  const { category, scores } = classify(fullCorpus, info.repo)
  const stack = detectStack(info, manifests, deployFiles)

  const capLabels = caps.map((c) => c.label)
  const top = capLabels.slice(0, 4)
  const capPhrase = top.length >= 2 ? `${top[0]}与${top[1]}` : top[0] || '工程实践'

  const zhParagraph = parsed.paragraphs.find((p) => chineseRatio(p) > 0.45 && p.length >= 10)
  const zhDesc = info.description && chineseRatio(info.description) > 0.4 ? info.description : null
  let tagline: string
  if (zhDesc) tagline = clamp(zhDesc, 46)
  else if (zhParagraph) tagline = clamp(zhParagraph.replace(/\s+/g, ' '), 46)
  else tagline = clamp(`${top.slice(0, 2).join('、')}${TAILS[category.name] ?? ''}`, 46)

  const summary =
    (zhParagraph ? clamp(zhParagraph, 160) + ' ' : '') + category.template.replace('{caps}', capPhrase)

  const highlights = capLabels.slice(0, 5)
  if (highlights.length < 3) {
    for (const e of audit.evidenceOnly) {
      if (highlights.length >= 4) break
      if (!highlights.includes(e.label)) highlights.push(e.label)
    }
    for (const h of parsed.headings) {
      if (highlights.length >= 4) break
      const t = clamp(h, 28)
      if (!highlights.includes(t)) highlights.push(t)
    }
  }

  const tags = Array.from(
    new Set([
      ...info.topics
        .filter((t) => /^[\x20-\x7e]+$/.test(t))
        .slice(0, 3)
        .map(titleCaseTag),
      ...caps.slice(0, 4).map((c) => c.tag),
      category.name,
    ]),
  ).slice(0, 6)

  const seed = hash(info.fullName)
  const glyph = category.glyph || GLYPHS[seed % GLYPHS.length]
  const accent = category.accent || ACCENTS[seed % ACCENTS.length]

  const signals: AnalysisSignals = {
    repo: info.fullName,
    language: info.language,
    languages: info.languages,
    stars: info.stars,
    forks: info.forks,
    license: info.license,
    topics: info.topics,
    manifests: Object.keys(manifests),
    dirs: info.rootEntries.slice(0, 18),
    fileCount: info.files.length,
    detectedStack: stack,
    lastCommitSha: info.commits[0]?.sha,
    recentCommits: info.commits.slice(0, 10),
    readmeChars: info.readme.length,
    keywordHits: caps.slice(0, 8).map((c) => ({ label: c.label, weight: c.score })),
    categoryScores: scores.slice(0, 4),
    audit,
    engine: 'local-semantic',
    notes: [
      `解析 README ${info.readme.length} 字符`,
      `扫描文件树 ${info.files.length} 条`,
      `识别能力点 ${caps.length} 个`,
      `核对 ${audit.verified.length + audit.claimedOnly.length + audit.unverifiable.length} 条宣称`,
      `分类置信度 ${scores[0]?.score ?? 0}`,
    ],
  }

  return {
    name: prettyName(info.repo),
    nameEn: info.repo,
    tagline,
    summary,
    highlights: highlights.slice(0, 5),
    tags,
    stack,
    category: category.name,
    glyph,
    accent,
    repoUrl: info.htmlUrl,
    demoUrl: info.homepage || null,
    stars: info.stars,
    license: info.license,
    language: info.language,
    signals,
  }
}

function titleCaseTag(t: string) {
  return t
    .split(/[-_]/)
    .map((w) => (w.length <= 3 ? w.toUpperCase() : w[0].toUpperCase() + w.slice(1)))
    .join(' ')
}

function prettyName(repo: string) {
  return repo
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim()
}

export function hash(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return Math.abs(h)
}
