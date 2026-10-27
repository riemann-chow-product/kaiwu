import { NextResponse } from 'next/server'
import { analyzeRepoUrl } from '@/lib/analyze'
import { createProject, createTenant, getTenantByHandle, listProjects, uniqueSlug } from '@/lib/db'
import { hashPass } from '@/lib/session'
import type { Draft } from '@/lib/types'

export const runtime = 'nodejs'
export const maxDuration = 300
export const dynamic = 'force-dynamic'

/**
 * 批量导入：给定一个空间与若干仓库地址，逐个跑识别流水线并上架。
 * 用于初始化自己的空间，也可作为「批量搬运」入口。
 *
 * 鉴权：本地开发直接可用；生产环境需要 x-kaiwu-token === KAIWU_SEED_TOKEN。
 */
export async function POST(req: Request) {
  if (process.env.NODE_ENV === 'production') {
    const token = req.headers.get('x-kaiwu-token')
    if (!process.env.KAIWU_SEED_TOKEN || token !== process.env.KAIWU_SEED_TOKEN) {
      return NextResponse.json({ error: '没有导入权限' }, { status: 403 })
    }
  }

  const body = await req.json().catch(() => null)
  if (!body?.repos?.length) return NextResponse.json({ error: 'repos 不能为空' }, { status: 400 })

  const t = body.tenant ?? {}
  const handle = String(t.handle ?? '').toLowerCase()
  if (!handle) return NextResponse.json({ error: 'tenant.handle 必填' }, { status: 400 })

  let tenant = getTenantByHandle(handle)
  if (!tenant) {
    tenant = createTenant({
      handle,
      name: String(t.name ?? handle),
      title: String(t.title ?? ''),
      bio: String(t.bio ?? ''),
      glyph: String(t.glyph ?? '◆'),
      accent: String(t.accent ?? '#B8442F'),
      github: t.github ?? null,
      website: t.website ?? null,
      passHash: t.pass ? hashPass(String(t.pass)) : null,
    })
  }

  const results: { url: string; slug?: string; skipped?: boolean; error?: string; engine?: string }[] = []

  for (const item of body.repos) {
    const url = typeof item === 'string' ? item : item.url
    const polish: Partial<Draft> = typeof item === 'string' ? {} : item.polish ?? {}
    try {
      // 每次循环重新查，避免并发导入时两次请求都判定「还不存在」
      const current = listProjects({ tenantId: tenant.id, includeAll: true })
      if (current.some((p) => p.repoUrl && url.includes(p.repoUrl.replace(/^https?:\/\/github\.com\//, '')))) {
        results.push({ url, skipped: true })
        continue
      }
      const { draft, warnings } = await analyzeRepoUrl(url)
      const merged: Draft = { ...draft, ...polish, signals: draft.signals }
      const slug = uniqueSlug(tenant.id, merged.nameEn || merged.name)
      const project = createProject({
        tenantId: tenant.id,
        slug,
        name: merged.name,
        nameEn: merged.nameEn,
        tagline: merged.tagline,
        summary: merged.summary,
        highlights: merged.highlights,
        tags: merged.tags,
        stack: merged.stack,
        category: merged.category,
        repoUrl: merged.repoUrl,
        demoUrl: merged.demoUrl,
        cover: (polish as { cover?: string }).cover ?? null,
        glyph: merged.glyph,
        accent: merged.accent,
        status: 'published',
        featured: results.length === 0 ? 1 : 0,
        source: 'github-ai',
        engine: merged.signals.engine,
        signals: merged.signals,
        stars: merged.stars,
        license: merged.license,
        language: merged.language,
      })
      results.push({ url, slug: project.slug, engine: merged.signals.engine })
      if (warnings.length) console.log(`[import] ${url}`, warnings)
    } catch (e) {
      results.push({ url, error: e instanceof Error ? e.message : String(e) })
    }
  }

  return NextResponse.json({ tenant: { handle: tenant.handle, id: tenant.id }, results })
}
