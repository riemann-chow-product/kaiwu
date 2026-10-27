import { NextResponse } from 'next/server'
import { buildAgentCard } from '@/lib/agent-card'
import { getTenantByHandle, listProjects } from '@/lib/db'
import { signPayload } from '@/lib/sign'

export const dynamic = 'force-dynamic'

export async function GET(req: Request, { params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params
  const tenant = getTenantByHandle(decodeURIComponent(handle))
  if (!tenant) return NextResponse.json({ error: '空间不存在' }, { status: 404 })

  const projects = listProjects({ tenantId: tenant.id })
  const url = new URL(req.url)
  const base = process.env.KAIWU_PUBLIC_URL || `${url.protocol}//${url.host}`

  const card = buildAgentCard(tenant, projects, base)
  const signature = signPayload(card)
  return NextResponse.json(
    { ...card, signature },
    {
      headers: {
        'Cache-Control': 'public, max-age=60',
        'Access-Control-Allow-Origin': '*',
      },
    },
  )
}
