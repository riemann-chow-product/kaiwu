import { NextResponse } from 'next/server'
import { createTenant, getTenantByHandle } from '@/lib/db'
import { hashPass, issueSession } from '@/lib/session'

export const dynamic = 'force-dynamic'

const HANDLE_RE = /^[a-z0-9][a-z0-9-]{1,23}$/

export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: '请求格式不对' }, { status: 400 })

  const handle = String(body.handle ?? '').trim().toLowerCase()
  const name = String(body.name ?? '').trim()
  const pass = String(body.pass ?? '')

  if (!HANDLE_RE.test(handle)) {
    return NextResponse.json(
      { error: '空间地址只能是 2-24 位小写字母、数字或连字符，且以字母数字开头' },
      { status: 400 },
    )
  }
  if (!name) return NextResponse.json({ error: '请填一个显示名' }, { status: 400 })
  if (getTenantByHandle(handle)) {
    return NextResponse.json({ error: '这个空间地址已经被占用了' }, { status: 409 })
  }

  const tenant = createTenant({
    handle,
    name,
    title: String(body.title ?? '').trim(),
    bio: String(body.bio ?? '').trim(),
    glyph: String(body.glyph ?? '◆').slice(0, 2),
    accent: String(body.accent ?? '#B8442F'),
    github: body.github ? String(body.github) : null,
    website: body.website ? String(body.website) : null,
    passHash: pass ? hashPass(pass) : null,
  })

  const res = NextResponse.json({ tenant: { handle: tenant.handle, name: tenant.name } })
  const session = issueSession(tenant.id)
  res.cookies.set(session.name, session.value, session.options)
  return res
}
