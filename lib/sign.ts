import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

/**
 * Agent Card 的可验证签名。
 *
 * 用 Ed25519 对卡片做 detached signature：任何人都能用
 * `/.well-known/kaiwu.json` 里的公钥验签，确认这张名片没被篡改、
 * 且确实由这个站点签发。密钥首次使用时生成，落在 data/agent-key.json（已 gitignore）。
 */

interface KeyFile {
  kid: string
  publicPem: string
  privatePem: string
}

const DATA_DIR = process.env.KAIWU_DATA_DIR || path.join(process.cwd(), 'data')
const KEY_PATH = path.join(DATA_DIR, 'agent-key.json')

let cache: KeyFile | null = null

function load(): KeyFile {
  if (cache) return cache
  try {
    if (fs.existsSync(KEY_PATH)) {
      cache = JSON.parse(fs.readFileSync(KEY_PATH, 'utf8')) as KeyFile
      if (cache?.kid && cache.publicPem && cache.privatePem) return cache
    }
  } catch {
    /* 损坏则重建 */
  }
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519')
  const publicPem = publicKey.export({ type: 'spki', format: 'pem' }).toString()
  const privatePem = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString()
  const der = publicKey.export({ type: 'spki', format: 'der' })
  const kid = crypto.createHash('sha256').update(der).digest('hex').slice(0, 16)
  const file: KeyFile = { kid, publicPem, privatePem }
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true })
    fs.writeFileSync(KEY_PATH, JSON.stringify(file, null, 2), { mode: 0o600 })
  } catch {
    /* 只读环境下降级为内存密钥 */
  }
  cache = file
  return file
}

/** 确定性序列化：递归排序对象键，保证签名与验签得到同一串字节 */
export function canonicalize(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(',')}]`
  const obj = value as Record<string, unknown>
  const keys = Object.keys(obj).sort()
  return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalize(obj[k])}`).join(',')}}`
}

export interface CardSignature {
  alg: 'EdDSA'
  kid: string
  signedAt: string
  /** base64url 编码的 Ed25519 签名 */
  value: string
}

export function signPayload(payload: unknown): CardSignature {
  const key = load()
  const sig = crypto.sign(null, Buffer.from(canonicalize(payload)), key.privatePem).toString('base64url')
  return { alg: 'EdDSA', kid: key.kid, signedAt: new Date().toISOString(), value: sig }
}

export function verifyPayload(payload: unknown, sig: CardSignature): boolean {
  try {
    const key = load()
    return crypto.verify(
      null,
      Buffer.from(canonicalize(payload)),
      key.publicPem,
      Buffer.from(sig.value, 'base64url'),
    )
  } catch {
    return false
  }
}

export function keyId(): string {
  return load().kid
}

export function publicJwk(): Record<string, unknown> {
  const key = load()
  const jwk = crypto.createPublicKey(key.publicPem).export({ format: 'jwk' }) as Record<string, unknown>
  return { ...jwk, kid: key.kid, alg: 'EdDSA', use: 'sig' }
}
