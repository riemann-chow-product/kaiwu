import { NextResponse } from 'next/server'
import { searchPortfolios } from '@/lib/search'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const url = new URL(req.url)
  const q = url.searchParams.get('q') ?? ''
  const handle = url.searchParams.get('handle') ?? undefined
  const limit = Math.min(Number(url.searchParams.get('limit') ?? 10) || 10, 50)

  const { hits, total } = searchPortfolios(q, { handle, limit })

  return NextResponse.json(
    {
      query: q,
      total,
      results: hits.map((h) => ({
        name: h.project.name,
        nameEn: h.project.nameEn,
        tagline: h.project.tagline,
        category: h.project.category,
        tags: h.project.tags,
        stack: h.project.stack,
        space: { handle: h.tenant.handle, name: h.tenant.name },
        url: `/${h.tenant.handle}/${h.project.slug}`,
        repo: h.project.repoUrl,
        demo: h.project.demoUrl,
        matched: h.matched,
        score: h.score,
      })),
    },
    { headers: { 'Access-Control-Allow-Origin': '*' } },
  )
}
