#!/usr/bin/env node
/**
 * 验证某个空间的 Agent Card 签名。
 *
 *   node scripts/verify-card.mjs [baseUrl] [handle]
 *   node scripts/verify-card.mjs http://localhost:4310 riemann
 *
 * 信任锚点是 /.well-known/kaiwu.json 里的公钥：卡片自带的 signature.kid
 * 必须能在 well-known 里找到对应公钥，再用它验签。
 */
import crypto from 'node:crypto'

const base = (process.argv[2] || 'http://localhost:4310').replace(/\/+$/, '')
const handle = process.argv[3] || 'riemann'

function canonicalize(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(',')}]`
  const keys = Object.keys(value).sort()
  return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalize(value[k])}`).join(',')}}`
}

const cardRes = await fetch(`${base}/api/agent-card/${handle}`)
if (!cardRes.ok) {
  console.error(`取卡片失败：HTTP ${cardRes.status}`)
  process.exit(1)
}
const card = await cardRes.json()
const { signature, ...payload } = card
if (!signature) {
  console.error('卡片没有签名')
  process.exit(1)
}

const wk = await fetch(`${base}/.well-known/kaiwu.json`).then((r) => r.json())
if (signature.kid !== wk.kid) {
  console.error(`kid 不一致：卡片 ${signature.kid} vs well-known ${wk.kid}`)
  process.exit(1)
}
const jwk = (wk.keys || []).find((k) => k.kid === signature.kid)
if (!jwk) {
  console.error('well-known 里找不到该 kid 对应的公钥')
  process.exit(1)
}

const publicKey = crypto.createPublicKey({ key: jwk, format: 'jwk' })
const ok = crypto.verify(
  null,
  Buffer.from(canonicalize(payload)),
  publicKey,
  Buffer.from(signature.value, 'base64url'),
)

console.log(`卡片：${payload.name} (@${payload.handle})`)
console.log(`kid：${signature.kid}   签名时间：${signature.signedAt}`)
console.log(ok ? '✓ 签名有效：卡片未被篡改，且由该站点签发' : '✗ 签名无效')
process.exit(ok ? 0 : 1)
