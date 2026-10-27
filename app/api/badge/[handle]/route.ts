import { getTenantByHandle, listProjects } from '@/lib/db'
import { badgeSvg, badgeResponse, scoreColor } from '@/lib/badge'

export const dynamic = 'force-dynamic'

/** 整个空间的平均核对分徽章 */
export async function GET(_req: Request, { params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params
  const t = getTenantByHandle(decodeURIComponent(handle))
  if (!t) return badgeResponse(badgeSvg({ label: 'kaiwu', value: 'not found', color: '#888780' }))

  const projects = listProjects({ tenantId: t.id })
  const scores = projects.map((p) => p.signals?.audit?.score).filter((s): s is number => typeof s === 'number')
  const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null

  const value = avg == null ? '未核对' : `${avg}/100`
  return badgeResponse(badgeSvg({ label: 'kaiwu', value, color: scoreColor(avg) }))
}
