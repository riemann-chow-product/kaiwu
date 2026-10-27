import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import type { Project, Tenant, ProjectStatus, AnalysisSignals } from './types'

/**
 * 轻量 JSON 仓储。
 *
 * 之所以不用 SQLite：这个站点的写入频率极低（一个人偶尔加一件作品），
 * 用文件存储可以做到零原生依赖 —— clone 下来 `npm install && npm run dev` 就能跑。
 * 所有读写都收在这一层，要换 Postgres / Supabase 只需要替换本文件的实现。
 */

const DATA_DIR = process.env.KAIWU_DATA_DIR || path.join(process.cwd(), 'data')
const DB_PATH = path.join(DATA_DIR, 'kaiwu.json')

interface Store {
  tenants: Tenant[]
  projects: Project[]
}

const EMPTY: Store = { tenants: [], projects: [] }

// 开发模式下 Next 会重复求值模块，用 global 兜住缓存
const g = globalThis as unknown as { __kaiwu?: Store }

function load(): Store {
  if (g.__kaiwu) return g.__kaiwu
  try {
    if (fs.existsSync(DB_PATH)) {
      const raw = JSON.parse(fs.readFileSync(DB_PATH, 'utf8')) as Store
      g.__kaiwu = {
        tenants: Array.isArray(raw.tenants) ? raw.tenants : [],
        projects: Array.isArray(raw.projects) ? raw.projects : [],
      }
    } else {
      g.__kaiwu = { ...EMPTY, tenants: [], projects: [] }
    }
  } catch {
    g.__kaiwu = { ...EMPTY, tenants: [], projects: [] }
  }
  return g.__kaiwu!
}

function persist() {
  const store = load()
  fs.mkdirSync(DATA_DIR, { recursive: true })
  const tmp = `${DB_PATH}.${process.pid}.tmp`
  fs.writeFileSync(tmp, JSON.stringify(store, null, 2), 'utf8')
  fs.renameSync(tmp, DB_PATH)
}

export const newId = (prefix: string) => `${prefix}_${crypto.randomBytes(9).toString('base64url')}`

/* ------------------------------- 空间 ------------------------------- */

export function listTenants(): (Tenant & { count: number })[] {
  const { tenants, projects } = load()
  return tenants
    .map((t) => ({
      ...t,
      count: projects.filter((p) => p.tenantId === t.id && p.status === 'published').length,
    }))
    .sort((a, b) => b.count - a.count || a.createdAt - b.createdAt)
}

export function getTenantByHandle(handle: string): Tenant | null {
  return load().tenants.find((t) => t.handle === handle.toLowerCase()) ?? null
}

export function getTenantById(id: string): Tenant | null {
  return load().tenants.find((t) => t.id === id) ?? null
}

export function createTenant(input: {
  handle: string
  name: string
  title?: string
  bio?: string
  glyph?: string
  accent?: string
  github?: string | null
  website?: string | null
  passHash?: string | null
}): Tenant {
  const store = load()
  const tenant: Tenant = {
    id: newId('t'),
    handle: input.handle.toLowerCase(),
    name: input.name,
    title: input.title ?? '',
    bio: input.bio ?? '',
    glyph: input.glyph ?? '◆',
    accent: input.accent ?? '#B8442F',
    github: input.github ?? null,
    website: input.website ?? null,
    passHash: input.passHash ?? null,
    createdAt: Date.now(),
  }
  store.tenants.push(tenant)
  persist()
  return tenant
}

export function updateTenant(
  id: string,
  patch: Partial<Pick<Tenant, 'name' | 'title' | 'bio' | 'glyph' | 'accent' | 'github' | 'website'>>,
): Tenant | null {
  const store = load()
  const t = store.tenants.find((x) => x.id === id)
  if (!t) return null
  Object.assign(t, patch)
  persist()
  return t
}

/* ------------------------------- 作品 ------------------------------- */

export function listProjects(
  opts: {
    tenantId?: string
    status?: ProjectStatus
    includeAll?: boolean
    limit?: number
    category?: string
    tag?: string
    q?: string
  } = {},
): Project[] {
  let rows = load().projects.slice()
  if (opts.tenantId) rows = rows.filter((p) => p.tenantId === opts.tenantId)
  if (!opts.includeAll) rows = rows.filter((p) => p.status === 'published')
  else if (opts.status) rows = rows.filter((p) => p.status === opts.status)
  if (opts.category) rows = rows.filter((p) => p.category === opts.category)
  if (opts.tag) rows = rows.filter((p) => p.tags.includes(opts.tag!))
  if (opts.q) {
    const q = opts.q.toLowerCase()
    rows = rows.filter((p) =>
      [p.name, p.nameEn, p.tagline, p.summary, p.tags.join(' ')]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q)),
    )
  }
  rows.sort((a, b) => b.featured - a.featured || b.publishedAt - a.publishedAt)
  return opts.limit ? rows.slice(0, opts.limit) : rows
}

export function getProject(tenantId: string, slug: string): Project | null {
  return load().projects.find((p) => p.tenantId === tenantId && p.slug === slug) ?? null
}

export function getProjectById(id: string): Project | null {
  return load().projects.find((p) => p.id === id) ?? null
}

export type ProjectInput = Omit<Project, 'id' | 'publishedAt' | 'updatedAt'> & {
  id?: string
  publishedAt?: number
}

export function createProject(p: ProjectInput): Project {
  const store = load()
  const now = Date.now()
  const project: Project = {
    ...p,
    id: p.id ?? newId('p'),
    publishedAt: p.publishedAt ?? now,
    updatedAt: now,
    highlights: p.highlights ?? [],
    tags: p.tags ?? [],
    stack: p.stack ?? [],
  }
  store.projects.push(project)
  persist()
  return project
}

export function updateProject(id: string, patch: Partial<ProjectInput>): Project | null {
  const store = load()
  const p = store.projects.find((x) => x.id === id)
  if (!p) return null
  const { id: _drop, publishedAt: _p, updatedAt: _u, ...rest } = patch as Record<string, unknown>
  Object.assign(p, rest)
  p.updatedAt = Date.now()
  persist()
  return p
}

export function deleteProject(id: string) {
  const store = load()
  store.projects = store.projects.filter((p) => p.id !== id)
  persist()
}

export function uniqueSlug(tenantId: string, base: string): string {
  const clean =
    base
      .toLowerCase()
      .replace(/[^a-z0-9\u4e00-\u9fa5-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48) || 'project'
  let slug = clean
  let i = 2
  while (getProject(tenantId, slug)) slug = `${clean}-${i++}`
  return slug
}

export function stats() {
  const { projects, tenants } = load()
  const published = projects.filter((p) => p.status === 'published')
  return {
    projects: published.length,
    tenants: tenants.length,
    categories: new Set(published.map((p) => p.category)).size,
  }
}

export type { AnalysisSignals }
