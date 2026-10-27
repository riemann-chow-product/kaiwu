import { getProject, getTenantByHandle } from '@/lib/db'
import { badgeSvg, badgeResponse, scoreColor } from '@/lib/badge'

export const dynamic = 'force-dynamic'

/** 单件作品的核对分徽章 */
export async function GET(_req: Request, { params }: { params: Promise<{ handle: string; slug: string }> }) {
  const { handle, slug } = await params
  const t = getTenantByHandle(decodeURIComponent(handle))
  const p = t ? getProject(t.id, decodeURIComponent(slug)) : null

  if (!p) return badgeResponse(badgeSvg({ label: 'kaiwu', value: 'not found', color: '#888780' }))

  const score = p.signals?.audit?.score ?? null
  const value = score == null ? '未核对' : `${score}/100`
  return badgeResponse(badgeSvg({ label: '核对', value, color: scoreColor(score) }))
}
