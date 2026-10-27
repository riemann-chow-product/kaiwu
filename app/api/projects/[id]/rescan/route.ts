import { NextResponse } from 'next/server'
import { analyzeRepoUrl } from '@/lib/analyze'
import { getProjectById, updateProject } from '@/lib/db'
import { diffScan } from '@/lib/diff'
import { summarizeChange } from '@/lib/summarize'
import { currentTenant } from '@/lib/session'

export const runtime = 'nodejs'
export const maxDuration = 60
export const dynamic = 'force-dynamic'

/** 重扫一个作品：只更新信号与动态，不改已经定稿的文案 */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const me = await currentTenant()
  if (!me) return NextResponse.json({ error: '未登录' }, { status: 401 })

  const { id } = await params
  const project = getProjectById(id)
  if (!project) return NextResponse.json({ error: '作品不存在' }, { status: 404 })
  if (project.tenantId !== me.id) return NextResponse.json({ error: '无权操作' }, { status: 403 })
  if (!project.repoUrl) return NextResponse.json({ error: '这个作品没有关联仓库，无法重扫' }, { status: 400 })

  try {
    const { draft } = await analyzeRepoUrl(project.repoUrl, { skipLlm: true })
    const entries = diffScan(project, { signals: draft.signals })
    const changeSummary = await summarizeChange(draft.signals.recentCommits ?? [])

    // 只更新信号与元信息。文案（name/tagline/summary/highlights/stack）是作者定稿的，重扫不碰
    const updated = updateProject(id, {
      signals: draft.signals,
      stars: draft.stars,
      license: draft.license,
      language: draft.language,
      lastScanAt: Date.now(),
      ...(changeSummary ? { changeSummary } : {}),
      changelog: [...entries, ...(project.changelog ?? [])].slice(0, 60),
    })
    return NextResponse.json({
      project: updated,
      changes: entries,
      changeSummary: changeSummary || null,
      audit: draft.signals.audit ?? null,
      scannedAt: Date.now(),
    })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : '重扫失败' },
      { status: 502 },
    )
  }
}
