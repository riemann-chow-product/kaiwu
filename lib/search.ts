import { getTenantById, listProjects, listTenants } from './db'
import type { Project, Tenant } from './types'

export interface SearchHit {
  project: Project
  tenant: Tenant
  score: number
  matched: string[]
}

const FIELDS: { key: keyof Project | 'capabilities'; weight: number; label: string }[] = [
  { key: 'name', weight: 10, label: '名称' },
  { key: 'nameEn', weight: 6, label: '英文名' },
  { key: 'tagline', weight: 5, label: '定位' },
  { key: 'tags', weight: 4, label: '标签' },
  { key: 'highlights', weight: 4, label: '能力' },
  { key: 'category', weight: 3, label: '分类' },
  { key: 'stack', weight: 3, label: '技术栈' },
  { key: 'capabilities', weight: 3, label: '识别信号' },
  { key: 'summary', weight: 2, label: '简介' },
]

function textOf(p: Project, key: (typeof FIELDS)[number]['key']): string {
  if (key === 'capabilities') {
    return (p.signals?.keywordHits ?? []).map((k) => k.label).join(' ')
  }
  const v = p[key]
  if (Array.isArray(v)) return v.join(' ')
  return typeof v === 'string' ? v : ''
}

/**
 * 跨空间检索。刻意不用向量：卡片数量在千以内时，
 * 「按字段加权 + 命中词回显」比黑盒向量更可解释，也更容易向用户交代为什么搜出来。
 */
export function searchPortfolios(
  q: string,
  opts: { handle?: string; limit?: number } = {},
): { hits: SearchHit[]; total: number } {
  const query = q.trim()
  if (!query) return { hits: [], total: 0 }

  const tokens = Array.from(new Set(query.split(/[\s,，、]+/).filter((t) => t.length > 0)))
  const tenants = listTenants()
  const pool = opts.handle
    ? listProjects({ tenantId: getTenantByHandleId(opts.handle) ?? '__none__' })
    : listProjects()

  const hits: SearchHit[] = []
  for (const p of pool) {
    let score = 0
    const matched: string[] = []
    for (const field of FIELDS) {
      const text = textOf(p, field.key).toLowerCase()
      if (!text) continue
      for (const token of tokens) {
        if (text.includes(token.toLowerCase())) {
          score += field.weight
          if (!matched.includes(field.label)) matched.push(field.label)
        }
      }
    }
    if (score > 0) {
      const tenant = tenants.find((t) => t.id === p.tenantId) ?? getTenantById(p.tenantId)
      if (tenant) hits.push({ project: p, tenant, score, matched })
    }
  }

  hits.sort((a, b) => b.score - a.score || b.project.publishedAt - a.project.publishedAt)
  return { hits: hits.slice(0, opts.limit ?? 10), total: hits.length }
}

function getTenantByHandleId(handle: string): string | null {
  const t = listTenants().find((x) => x.handle === handle.toLowerCase())
  return t?.id ?? null
}
