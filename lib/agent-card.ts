import type { Project, Tenant } from './types'
import type { CardSignature } from './sign'

export interface AgentCard {
  schemaVersion: string
  kind: string
  name: string
  handle: string
  description: string
  url: string
  avatar: { glyph: string; accent: string }
  links: { github: string | null; website: string | null; agentCard: string }
  skills: {
    id: string
    name: string
    nameEn: string | null
    description: string
    category: string
    tags: string[]
    stack: string[]
    endpoints: { page: string; repo: string | null; demo: string | null }
    evidence: { verified: number; claimedOnly: number; score: number | null }
    lastScannedAt: number | null
  }[]
  capabilities: {
    categories: string[]
    stack: string[]
    totalProjects: number
    verifiedClaims: number
    claimedOnly: number
    auditScore: number | null
  }
  generatedAt: string
  /** Ed25519 detached signature —— 可被 /.well-known/kaiwu.json 的公钥验签 */
  signature?: CardSignature
}

/**
 * 「人的 Agent Card」：把一个空间的作品集导出成机器可读的自我描述。
 * 字段习惯对齐 A2A 的 AgentCard，让别的智能体能像发现一个 agent 那样发现一个人。
 */
export function buildAgentCard(tenant: Tenant, projects: Project[], baseUrl: string): AgentCard {
  const base = baseUrl.replace(/\/+$/, '')
  const skills = projects.map((p) => {
    const audit = p.signals?.audit
    return {
      id: p.slug,
      name: p.name,
      nameEn: p.nameEn,
      description: p.tagline,
      category: p.category,
      tags: p.tags,
      stack: p.stack,
      endpoints: {
        page: `${base}/${tenant.handle}/${p.slug}`,
        repo: p.repoUrl,
        demo: p.demoUrl,
      },
      evidence: {
        verified: audit?.verified.length ?? 0,
        claimedOnly: audit?.claimedOnly.length ?? 0,
        score: audit?.score ?? null,
      },
      lastScannedAt: p.lastScanAt ?? null,
    }
  })

  const verifiedClaims = skills.reduce((n, s) => n + s.evidence.verified, 0)
  const claimedOnly = skills.reduce((n, s) => n + s.evidence.claimedOnly, 0)
  const denom = verifiedClaims + claimedOnly

  return {
    schemaVersion: '1.0',
    kind: 'human-portfolio',
    name: tenant.name,
    handle: tenant.handle,
    description: tenant.title || tenant.bio || `${tenant.name} 的作品空间`,
    url: `${base}/${tenant.handle}`,
    avatar: { glyph: tenant.glyph, accent: tenant.accent },
    links: {
      github: tenant.github,
      website: tenant.website,
      agentCard: `${base}/api/agent-card/${tenant.handle}`,
    },
    skills,
    capabilities: {
      categories: Array.from(new Set(projects.map((p) => p.category))),
      stack: Array.from(new Set(projects.flatMap((p) => p.stack))).slice(0, 24),
      totalProjects: projects.length,
      verifiedClaims,
      claimedOnly,
      auditScore: denom > 0 ? Math.round((verifiedClaims / denom) * 100) : null,
    },
    generatedAt: new Date().toISOString(),
  }
}
