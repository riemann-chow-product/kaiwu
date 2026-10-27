import { NextResponse } from 'next/server'
import { getTenantByHandle, listProjects } from '@/lib/db'
import { matchJd } from '@/lib/capability'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  const handle = String(body?.handle ?? '').trim().toLowerCase().replace(/^@/, '')
  const jd = String(body?.jd ?? '')
  if (!handle) return NextResponse.json({ error: '缺少 handle' }, { status: 400 })

  const tenant = getTenantByHandle(handle)
  if (!tenant) return NextResponse.json({ error: '空间不存在' }, { status: 404 })

  const projects = listProjects({ tenantId: tenant.id })
  return NextResponse.json(matchJd(projects, jd))
}
