import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getTenantByHandle, listProjects } from '@/lib/db'
import { ProjectCard } from '@/components/project-card'
import { CapabilityRadar } from '@/components/capability-radar'
import { JdMatch } from '@/components/jd-match'
import { aggregateCategories } from '@/lib/capability'
import { formatDate } from '@/lib/format'

export const dynamic = 'force-dynamic'

type Params = { tenant: string }

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { tenant } = await params
  const t = getTenantByHandle(decodeURIComponent(tenant))
  if (!t) return { title: '空间不存在' }
  return { title: `${t.name} 的空间`, description: t.title || t.bio || undefined }
}

export default async function TenantPage({
  params,
  searchParams,
}: {
  params: Promise<Params>
  searchParams: Promise<{ c?: string }>
}) {
  const { tenant } = await params
  const { c } = await searchParams
  const t = getTenantByHandle(decodeURIComponent(tenant))
  if (!t) notFound()

  const all = listProjects({ tenantId: t.id })
  const categories = Array.from(new Set(all.map((p) => p.category)))
  const active = c && categories.includes(c) ? c : null
  const projects = active ? all.filter((p) => p.category === active) : all

  const tagPool = Array.from(new Set(all.flatMap((p) => p.tags))).slice(0, 10)
  const since = all.length ? Math.min(...all.map((p) => p.publishedAt)) : Date.now()
  const radar = aggregateCategories(all)

  return (
    <>
      <section className="detail-hero">
        <div className="wrap">
          <div className="row" style={{ gap: 18, alignItems: 'flex-start' }}>
            <span
              className="tenant-avatar"
              style={{
                width: 62,
                height: 62,
                borderRadius: 16,
                fontSize: 27,
                background: `${t.accent}14`,
                color: t.accent,
              }}
            >
              {t.glyph}
            </span>
            <div style={{ flex: 1, minWidth: 240 }}>
              <div className="eyebrow">@{t.handle} · 空间</div>
              <h1 className="detail-title" style={{ marginTop: 8 }}>
                {t.name}
              </h1>
              {t.title ? <p className="detail-tagline">{t.title}</p> : null}
            </div>
            <div className="row" style={{ paddingTop: 8 }}>
              {t.github ? (
                <a className="pill link" href={t.github} target="_blank" rel="noreferrer">
                  GitHub ↗
                </a>
              ) : null}
              {t.website ? (
                <a className="pill link" href={t.website} target="_blank" rel="noreferrer">
                  主页 ↗
                </a>
              ) : null}
            </div>
          </div>

          {t.bio ? (
            <p className="lede" style={{ marginTop: 24 }}>
              {t.bio}
            </p>
          ) : null}

          <div className="row" style={{ marginTop: 26, gap: 26 }}>
            <span className="mono muted">{all.length} 件作品</span>
            <span className="mono muted">{categories.length} 个分类</span>
            <span className="mono muted">始于 {formatDate(since)}</span>
          </div>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 34 }}>
        <div className="wrap">
          {categories.length > 1 ? (
            <div className="filter-row">
              <Link className="filter-chip" data-active={!active} href={`/${t.handle}`}>
                全部
              </Link>
              {categories.map((cat) => (
                <Link
                  key={cat}
                  className="filter-chip"
                  data-active={active === cat}
                  href={`/${t.handle}?c=${encodeURIComponent(cat)}`}
                >
                  {cat}
                </Link>
              ))}
            </div>
          ) : null}

          {projects.length === 0 ? (
            <div className="empty">
              这个空间还是空的。{active ? <Link href={`/${t.handle}`}>看看全部</Link> : null}
            </div>
          ) : (
            <div className={projects.length <= 2 ? 'grid two' : 'grid'}>
              {projects.map((p) => (
                <ProjectCard key={p.id} project={p} href={`/${t.handle}/${p.slug}`} />
              ))}
            </div>
          )}

          {tagPool.length ? (
            <div style={{ marginTop: 40 }}>
              <div className="eyebrow" style={{ marginBottom: 12 }}>
                这个空间里出现过的东西
              </div>
              <div className="row" style={{ gap: 6 }}>
                {tagPool.map((tag) => (
                  <span className="pill solid" key={tag}>
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </section>

      {all.length ? (
        <section className="section" style={{ paddingTop: 0 }}>
          <div className="wrap">
            <div className="section-head">
              <div>
                <div className="eyebrow">能力画像</div>
                <h2 className="h2">这个人整体会什么</h2>
              </div>
            </div>
            <div className="detail-grid">
              <div>
                <div style={{ maxWidth: 360 }}>
                  <CapabilityRadar categories={radar.categories} values={radar.values} />
                </div>
                <p className="help" style={{ marginTop: 10, maxWidth: 360 }}>
                  六个分类轴，按作品里识别到的分类强度聚合。越靠外说明这个方向的作品越多、信号越强。
                </p>
              </div>
              <aside>
                <JdMatch handle={t.handle} />
              </aside>
            </div>
          </div>
        </section>
      ) : null}

      <section className="section">
        <div className="wrap between">
          <div>
            <h2 className="h2">也想有这样一页？</h2>
            <p className="lede" style={{ marginTop: 12 }}>
              开一个空间，把你的仓库一个个贴进来。
            </p>
          </div>
          <div className="row">
            <Link className="btn" href="/join">
              开通空间
            </Link>
            <Link className="btn ghost" href="/submit">
              直接提交作品
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}
