import type { Project } from './types'
import { CATEGORY_ORDER } from './format'

/** 把空间内所有作品的能力强度聚合成一张雷达图数据（6 个分类轴，0-100） */
export function aggregateCategories(projects: Project[]): { categories: string[]; values: number[] } {
  const acc = new Map<string, number>()
  for (const c of CATEGORY_ORDER) acc.set(c, 0)

  for (const p of projects) {
    for (const s of p.signals?.categoryScores ?? []) {
      if (!acc.has(s.category) || !s.score) continue
      acc.set(s.category, (acc.get(s.category) ?? 0) + s.score)
    }
    if (acc.has(p.category)) acc.set(p.category, (acc.get(p.category) ?? 0) + 6)
  }

  const raw = CATEGORY_ORDER.map((c) => acc.get(c) ?? 0)
  const max = Math.max(1, ...raw)
  return {
    categories: [...CATEGORY_ORDER],
    values: raw.map((v) => Math.round((v / max) * 100)),
  }
}

export interface JdMatchItem {
  label: string
  project: string
  verified: boolean
  proof?: string
}

export interface JdMatchResult {
  matched: JdMatchItem[]
  matchedCount: number
  verifiedCount: number
  /** 命中的能力点里，有多少比例有代码佐证 */
  evidenceRate: number
}

/** 过于通用的 tag，命中它们说明不了什么，排除掉 */
const GENERIC = new Set(['API', 'CLI', '开源', 'CI', 'Docker'])

/**
 * 拿一段 JD 文本去和这个空间的能力点做匹配。
 *
 * 只回答一件诚实的事：「你命中了哪些能力点，其中哪些有代码佐证」，
 * 而不是编一个看起来精确的匹配分。
 */
export function matchJd(projects: Project[], jd: string): JdMatchResult {
  const text = (jd || '').toLowerCase()
  if (!text.trim()) return { matched: [], matchedCount: 0, verifiedCount: 0, evidenceRate: 0 }

  const matched: JdMatchItem[] = []
  const seen = new Set<string>()

  for (const p of projects) {
    const a = p.signals?.audit
    const verifiedTags = new Set((a?.verified ?? []).map((v) => v.tag))
    const pool = [
      ...(a?.verified ?? []).map((v) => ({ label: v.label, tag: v.tag, proof: v.proof as string | undefined })),
      ...(a?.claimedOnly ?? []).map((v) => ({ label: v.label, tag: v.tag, proof: undefined })),
      ...(a?.evidenceOnly ?? []).map((v) => ({ label: v.label, tag: v.tag, proof: v.proof as string | undefined })),
    ]

    for (const item of pool) {
      if (GENERIC.has(item.tag) || seen.has(item.tag)) continue
      const hit = text.includes(item.label.toLowerCase()) || text.includes(item.tag.toLowerCase())
      if (!hit) continue
      seen.add(item.tag)
      matched.push({ label: item.label, project: p.name, verified: verifiedTags.has(item.tag), proof: item.proof })
    }

    for (const s of p.stack) {
      const key = `stack:${s.toLowerCase()}`
      if (seen.has(key)) continue
      if (text.includes(s.toLowerCase())) {
        seen.add(key)
        matched.push({ label: s, project: p.name, verified: true })
      }
    }
  }

  const verifiedCount = matched.filter((m) => m.verified).length
  const evidenceRate = matched.length ? Math.round((verifiedCount / matched.length) * 100) : 0
  return { matched, matchedCount: matched.length, verifiedCount, evidenceRate }
}
