import { NextResponse } from 'next/server'
import { listTenants, updateTenant } from '@/lib/db'
import { currentTenant } from '@/lib/session'

export const dynamic = 'force-dynamic'

/** 列出所有公开空间（供 MCP / 外部 agent 发现） */
export async function GET() {
  return NextResponse.json(
    {
      spaces: listTenants().map((t) => ({
        handle: t.handle,
        name: t.name,
        title: t.title,
        bio: t.bio,
        projects: t.count,
        url: `/${t.handle}`,
        agentCard: `/api/agent-card/${t.handle}`,
        github: t.github,
      })),
    },
    { headers: { 'Access-Control-Allow-Origin': '*' } },
  )
}

export async function PATCH(req: Request) {
  const me = await currentTenant()
  if (!me) return NextResponse.json({ error: '未登录' }, { status: 401 })

  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: '请求格式不对' }, { status: 400 })

  const patch: Record<string, string | null> = {}
  for (const key of ['name', 'title', 'bio', 'glyph', 'accent', 'github', 'website'] as const) {
    if (key in body) patch[key] = body[key] ? String(body[key]) : ''
  }

  const updated = updateTenant(me.id, patch as any)
  return NextResponse.json({ tenant: updated })
}
