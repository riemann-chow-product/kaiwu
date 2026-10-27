import Link from 'next/link'
import type { Metadata } from 'next'
import { listProjects, listTenants } from '@/lib/db'
import { ProjectCard } from '@/components/project-card'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: '全部作品',
  description: '开物上所有空间公开摆出来的作品。',
}

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string; q?: string }>
}) {
  const { c, q } = await searchParams
  const all = listProjects({ q })
  const tenants = listTenants()
  const tenantById = new Map(tenants.map((t) => [t.id, t]))
  const categories = Array.from(new Set(all.map((p) => p.category)))
  const active = c && categories.includes(c) ? c : null
  const projects = active ? all.filter((p) => p.category === active) : all

  return (
    <>
      <section className="detail-hero">
        <div className="wrap">
          <div className="eyebrow">Explore</div>
          <h1 className="detail-title">全部作品</h1>
          <p className="detail-tagline">
            {all.length} 件作品，来自 {tenants.length} 个空间。每一张卡片背后都是一个真实的仓库。
          </p>

          <form action="/explore" method="get" className="row" style={{ marginTop: 26, gap: 10 }}>
            <input
              className="input"
              name="q"
              defaultValue={q ?? ''}
              placeholder="搜名字、描述…"
              style={{ maxWidth: 280 }}
            />
            {c ? <input type="hidden" name="c" value={c} /> : null}
            <button className="btn small" type="submit">
              搜索
            </button>
            {q ? (
              <Link className="btn ghost small" href="/explore">
                清除
              </Link>
            ) : null}
          </form>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 30 }}>
        <div className="wrap">
          {categories.length > 1 ? (
            <div className="filter-row">
              <Link className="filter-chip" data-active={!active} href={q ? `/explore?q=${q}` : '/explore'}>
                全部
              </Link>
              {categories.map((cat) => (
                <Link
                  key={cat}
                  className="filter-chip"
                  data-active={active === cat}
                  href={`/explore?c=${encodeURIComponent(cat)}${q ? `&q=${q}` : ''}`}
                >
                  {cat}
                </Link>
              ))}
            </div>
          ) : null}

          {projects.length === 0 ? (
            <div className="empty">
              没有匹配的作品。
              <br />
              试试 <Link href="/submit" style={{ color: 'var(--accent)' }}>自己上架一个</Link>。
            </div>
          ) : (
            <div className={projects.length <= 2 ? 'grid two' : 'grid'}>
              {projects.map((p) => (
                <ProjectCard
                  key={p.id}
                  project={p}
                  href={`/${tenantById.get(p.tenantId)?.handle ?? 'u'}/${p.slug}`}
                  showTenant={tenantById.get(p.tenantId)?.name}
                />
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  )
}
