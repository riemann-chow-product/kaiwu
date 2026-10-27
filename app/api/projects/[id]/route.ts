import { NextResponse } from 'next/server'
import { deleteProject, getProjectById, updateProject } from '@/lib/db'
import { currentTenant } from '@/lib/session'

export const dynamic = 'force-dynamic'

async function guard(id: string) {
  const me = await currentTenant()
  if (!me) return { error: NextResponse.json({ error: '未登录' }, { status: 401 }) }
  const p = getProjectById(id)
  if (!p) return { error: NextResponse.json({ error: '作品不存在' }, { status: 404 }) }
  if (p.tenantId !== me.id) return { error: NextResponse.json({ error: '无权修改' }, { status: 403 }) }
  return { me, project: p }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const g = await guard(id)
  if ('error' in g) return g.error

  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: '请求格式不对' }, { status: 400 })

  const patch: Record<string, unknown> = {}
  for (const key of ['name', 'nameEn', 'tagline', 'summary', 'category', 'repoUrl', 'demoUrl', 'cover', 'glyph', 'accent', 'license', 'language'] as const) {
    if (key in body) patch[key] = body[key] === '' ? null : body[key]
  }
  for (const key of ['highlights', 'tags', 'stack'] as const) {
    if (Array.isArray(body[key])) patch[key] = body[key].filter(Boolean).map(String)
  }
  if (body.status === 'published' || body.status === 'draft' || body.status === 'archived') {
    patch.status = body.status
  }
  if ('featured' in body) patch.featured = body.featured ? 1 : 0

  const updated = updateProject(id, patch as any)
  return NextResponse.json({ project: updated })
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const g = await guard(id)
  if ('error' in g) return g.error
  deleteProject(id)
  return NextResponse.json({ ok: true })
}
