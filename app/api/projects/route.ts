import { NextResponse } from 'next/server'
import { createProject, listProjects, uniqueSlug } from '@/lib/db'
import { currentTenant } from '@/lib/session'

export const dynamic = 'force-dynamic'

export async function GET() {
  const me = await currentTenant()
  if (!me) return NextResponse.json({ error: '未登录' }, { status: 401 })
  return NextResponse.json({ projects: listProjects({ tenantId: me.id, includeAll: true }) })
}

export async function POST(req: Request) {
  const me = await currentTenant()
  if (!me) return NextResponse.json({ error: '请先开通或登录空间' }, { status: 401 })

  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: '请求格式不对' }, { status: 400 })

  const name = String(body.name ?? '').trim()
  if (!name) return NextResponse.json({ error: '作品名不能为空' }, { status: 400 })

  const slug = uniqueSlug(me.id, String(body.slug ?? body.nameEn ?? name))

  const project = createProject({
    tenantId: me.id,
    slug,
    name,
    nameEn: body.nameEn ? String(body.nameEn).trim() : null,
    tagline: String(body.tagline ?? '').trim(),
    summary: String(body.summary ?? '').trim(),
    highlights: Array.isArray(body.highlights) ? body.highlights.filter(Boolean).map(String) : [],
    tags: Array.isArray(body.tags) ? body.tags.filter(Boolean).map(String) : [],
    stack: Array.isArray(body.stack) ? body.stack.filter(Boolean).map(String) : [],
    category: String(body.category ?? '未分类'),
    repoUrl: body.repoUrl ? String(body.repoUrl) : null,
    demoUrl: body.demoUrl ? String(body.demoUrl) : null,
    cover: body.cover ? String(body.cover) : null,
    glyph: String(body.glyph ?? '◆'),
    accent: String(body.accent ?? '#C6402F'),
    status: body.status === 'draft' ? 'draft' : 'published',
    featured: body.featured ? 1 : 0,
    source: body.source === 'manual' ? 'manual' : 'github-ai',
    engine: body.engine ? String(body.engine) : null,
    signals: body.signals ?? null,
    stars: typeof body.stars === 'number' ? body.stars : null,
    license: body.license ? String(body.license) : null,
    language: body.language ? String(body.language) : null,
  })

  return NextResponse.json({ project })
}
