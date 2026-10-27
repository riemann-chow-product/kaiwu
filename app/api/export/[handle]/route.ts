import { NextResponse } from 'next/server'
import { getTenantByHandle, listProjects } from '@/lib/db'
import { buildReadme } from '@/lib/export'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: Request, { params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params
  const t = getTenantByHandle(decodeURIComponent(handle))
  if (!t) return NextResponse.json({ error: '空间不存在' }, { status: 404 })

  const projects = listProjects({ tenantId: t.id })
  const url = new URL(req.url)
  const base = process.env.KAIWU_PUBLIC_URL || `${url.protocol}//${url.host}`
  const md = buildReadme(t, projects, base)

  return new Response(md, {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Content-Disposition': `attachment; filename="${t.handle}-readme.md"`,
    },
  })
}
