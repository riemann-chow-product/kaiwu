import { NextResponse } from 'next/server'
import { getProjectById, updateProject } from '@/lib/db'
import { currentTenant } from '@/lib/session'
import { questionFor } from '@/lib/selfproof'
import type { SelfProof } from '@/lib/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** 作者对一个「只有说法」的能力点补充自证 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const me = await currentTenant()
  if (!me) return NextResponse.json({ error: '未登录' }, { status: 401 })

  const { id } = await params
  const project = getProjectById(id)
  if (!project) return NextResponse.json({ error: '作品不存在' }, { status: 404 })
  if (project.tenantId !== me.id) return NextResponse.json({ error: '无权操作' }, { status: 403 })

  const body = await req.json().catch(() => null)
  const tag = String(body?.tag ?? '')
  const answer = String(body?.answer ?? '').trim()
  if (!tag || !answer) return NextResponse.json({ error: '缺少 tag 或说明内容' }, { status: 400 })

  const item = project.signals?.audit?.claimedOnly.find((x) => x.tag === tag)
  if (!item) return NextResponse.json({ error: '该能力点不在待自证列表' }, { status: 400 })

  const existing = project.selfProofs ?? []
  const idx = existing.findIndex((x) => x.tag === tag)
  const entry: SelfProof = {
    tag,
    label: item.label,
    question: questionFor(item),
    answer: answer.slice(0, 600),
    at: Date.now(),
  }
  const selfProofs = idx >= 0 ? existing.map((x, i) => (i === idx ? entry : x)) : [...existing, entry]

  const updated = updateProject(id, { selfProofs })
  return NextResponse.json({ ok: true, selfProofs: updated?.selfProofs ?? selfProofs })
}
