import { NextResponse } from 'next/server'
import { getTenantByHandle } from '@/lib/db'
import { issueSession, verifyPass } from '@/lib/session'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: '请求格式不对' }, { status: 400 })

  const handle = String(body.handle ?? '').trim().toLowerCase().replace(/^@/, '')
  const pass = String(body.pass ?? '')
  const tenant = getTenantByHandle(handle)

  if (!tenant) return NextResponse.json({ error: '没有这个空间' }, { status: 404 })
  if (!verifyPass(pass, tenant.passHash)) {
    return NextResponse.json({ error: '口令不对' }, { status: 401 })
  }

  const res = NextResponse.json({ tenant: { handle: tenant.handle, name: tenant.name } })
  const session = issueSession(tenant.id)
  res.cookies.set(session.name, session.value, session.options)
  return res
}
