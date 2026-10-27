import { NextResponse } from 'next/server'
import { publicJwk, keyId } from '@/lib/sign'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const url = new URL(req.url)
  const base = process.env.KAIWU_PUBLIC_URL || `${url.protocol}//${url.host}`

  return NextResponse.json(
    {
      issuer: base,
      alg: 'EdDSA',
      kid: keyId(),
      keys: [publicJwk()],
      usage: {
        card: `${base}/api/agent-card/{handle}`,
        verify:
          '取卡片 JSON，删除 signature 字段后做 canonicalize（递归按 key 排序），用 keys 中对应 kid 的公钥验证 signature.value（base64url 的 Ed25519 签名）。',
      },
    },
    {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=300',
      },
    },
  )
}
