import { NextResponse } from 'next/server'
import { clearSession } from '@/lib/session'

export async function POST() {
  const res = NextResponse.json({ ok: true })
  const c = clearSession()
  res.cookies.set(c.name, c.value, c.options)
  return res
}
