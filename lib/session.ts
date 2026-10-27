import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { cookies } from 'next/headers'
import { getTenantById } from './db'
import type { Tenant } from './types'

const COOKIE = 'kw_session'

function secret(): string {
  if (process.env.KAIWU_SECRET) return process.env.KAIWU_SECRET
  const dir = process.env.KAIWU_DATA_DIR || path.join(process.cwd(), 'data')
  const file = path.join(dir, 'secret.key')
  try {
    if (fs.existsSync(file)) return fs.readFileSync(file, 'utf8').trim()
    fs.mkdirSync(dir, { recursive: true })
    const s = crypto.randomBytes(32).toString('hex')
    fs.writeFileSync(file, s, { mode: 0o600 })
    return s
  } catch {
    return 'kaiwu-dev-fallback-secret'
  }
}

const sign = (payload: string) =>
  crypto.createHmac('sha256', secret()).update(payload).digest('base64url')

export function issueSession(tenantId: string): { name: string; value: string; options: any } {
  const value = `${tenantId}.${sign(tenantId)}`
  return {
    name: COOKIE,
    value,
    options: {
      httpOnly: true,
      sameSite: 'lax' as const,
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
    },
  }
}

export const clearSession = () => ({
  name: COOKIE,
  value: '',
  options: { httpOnly: true, path: '/', maxAge: 0 },
})

/** 当前登录的空间（服务端组件 / 路由处理里都能用） */
export async function currentTenant(): Promise<Tenant | null> {
  const jar = await cookies()
  const raw = jar.get(COOKIE)?.value
  if (!raw) return null
  const idx = raw.lastIndexOf('.')
  if (idx < 0) return null
  const tenantId = raw.slice(0, idx)
  const mac = raw.slice(idx + 1)
  const expected = sign(tenantId)
  if (mac.length !== expected.length) return null
  if (!crypto.timingSafeEqual(Buffer.from(mac), Buffer.from(expected))) return null
  return getTenantById(tenantId)
}

export function hashPass(pass: string): string {
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.scryptSync(pass, salt, 32).toString('hex')
  return `scrypt$${salt}$${hash}`
}

export function verifyPass(pass: string, stored: string | null): boolean {
  if (!stored) return true // 无口令的空间 = 演示空间，任何人都能进管理台
  const [algo, salt, hash] = stored.split('$')
  if (algo !== 'scrypt' || !salt || !hash) return false
  const calc = crypto.scryptSync(pass, salt, 32).toString('hex')
  return crypto.timingSafeEqual(Buffer.from(calc), Buffer.from(hash))
}
