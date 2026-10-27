import { NextResponse } from 'next/server'
import { analyzeRepoUrl } from '@/lib/analyze'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(req: Request) {
  let url = ''
  try {
    const body = await req.json()
    url = String(body?.url ?? '').trim()
  } catch {
    return NextResponse.json({ error: '请求格式不对' }, { status: 400 })
  }

  if (!url) return NextResponse.json({ error: '请先贴一个 GitHub 仓库地址' }, { status: 400 })

  try {
    const { draft, warnings } = await analyzeRepoUrl(url)
    return NextResponse.json({ draft, warnings })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : '识别失败，请稍后重试' },
      { status: 502 },
    )
  }
}
