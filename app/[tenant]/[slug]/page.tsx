import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getProject, getTenantById, getTenantByHandle, listProjects } from '@/lib/db'
import { CoverArt } from '@/components/cover-art'
import { ProjectCard } from '@/components/project-card'
import { AuditBlock } from '@/components/audit-block'
import { SelfProofCard } from '@/components/self-proof'
import { currentTenant } from '@/lib/session'
import { questionFor } from '@/lib/selfproof'
import { compactNumber, formatDate, timeAgo } from '@/lib/format'

export const dynamic = 'force-dynamic'

type Params = { tenant: string; slug: string }

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { tenant, slug } = await params
  const t = getTenantByHandle(decodeURIComponent(tenant))
  const p = t ? getProject(t.id, slug) : null
  if (!p) return { title: '作品不存在' }
  return { title: `${p.name} — ${p.tagline}`, description: p.summary }
}

export default async function ProjectPage({ params }: { params: Promise<Params> }) {
  const { tenant, slug } = await params
  const t = getTenantByHandle(decodeURIComponent(tenant))
  if (!t) notFound()
  const p = getProject(t.id, slug)
  if (!p || (p.status !== 'published' && p.status !== 'draft')) notFound()

  const me = await currentTenant()
  const isOwner = me?.id === t.id
  const proofByTag = new Map((p.selfProofs ?? []).map((s) => [s.tag, s.answer]))

  const related = listProjects({ category: p.category, limit: 4 }).filter((x) => x.id !== p.id).slice(0, 3)
  const tenantById = new Map(
    related.map((r) => [r.tenantId, getTenantById(r.tenantId)] as const),
  )

  return (
    <>
      <section className="detail-hero">
        <div className="wrap">
          <div className="eyebrow">
            <Link href={`/${t.handle}`} style={{ color: 'var(--muted)' }}>
              {t.name} 的空间
            </Link>
            <span style={{ margin: '0 8px' }}>/</span>
            {p.category}
          </div>

          <h1 className="detail-title">{p.name}</h1>
          {p.nameEn && p.nameEn !== p.name ? (
            <div className="mono muted" style={{ marginTop: 8 }}>
              {p.nameEn}
            </div>
          ) : null}
          <p className="detail-tagline">{p.tagline}</p>

          <div className="row" style={{ marginTop: 24, gap: 6 }}>
            {p.tags.map((tag) => (
              <span className="pill" key={tag}>
                {tag}
              </span>
            ))}
          </div>
        </div>
      </section>

      <div className="wrap">
        <div className={p.cover ? 'cover-frame has-image' : 'cover-frame'}>
          <CoverArt
            seed={p.id}
            accent={p.accent}
            glyph={p.glyph}
            label={`${p.category} · ${t.name}`}
            image={p.cover}
            name={p.name}
          />
        </div>
      </div>

      <section className="detail-grid wrap">
        <div>
          <div className="prose">
            {p.summary.split(/\n{2,}/).map((para, i) => (
              <p key={i}>{para}</p>
            ))}
          </div>

          {p.signals?.audit ? (
            <div style={{ marginTop: 30 }}>
              <AuditBlock audit={p.signals.audit} collapsible />
            </div>
          ) : null}

          {p.signals?.audit?.claimedOnly?.length ? (
            <div style={{ marginTop: 30 }}>
              <div className="eyebrow" style={{ marginBottom: 14 }}>
                待自证 · 只有说法、缺代码佐证
              </div>
              <div className="stack-8">
                {p.signals.audit.claimedOnly.map((item) => (
                  <SelfProofCard
                    key={item.tag}
                    projectId={p.id}
                    tag={item.tag}
                    label={item.label}
                    question={questionFor(item)}
                    initialAnswer={proofByTag.get(item.tag) ?? ''}
                    canEdit={isOwner}
                  />
                ))}
              </div>
            </div>
          ) : null}

          {p.highlights.length ? (
            <div style={{ marginTop: 34 }}>
              <div className="eyebrow" style={{ marginBottom: 14 }}>
                能做的事
              </div>
              <ul className="highlight-list">
                {p.highlights.map((h, i) => (
                  <li key={i}>{h}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {p.changelog && p.changelog.length ? (
            <div style={{ marginTop: 40 }}>
              <div className="eyebrow" style={{ marginBottom: 16 }}>
                作品动态
              </div>
              {p.changeSummary ? (
                <p
                  style={{
                    margin: '0 0 18px',
                    fontSize: 14,
                    lineHeight: 1.7,
                    color: 'var(--ink-soft)',
                    borderLeft: '2px solid var(--accent)',
                    paddingLeft: 12,
                  }}
                >
                  {p.changeSummary}
                </p>
              ) : null}
              <ul className="timeline">
                {p.changelog.slice(0, 12).map((c, i) => (
                  <li key={i} data-type={c.type}>
                    {c.text}
                    <span className="when">{formatDate(c.at)}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {p.signals ? (
            <details style={{ marginTop: 40 }}>
              <summary
                className="mono muted"
                style={{ cursor: 'pointer', letterSpacing: '0.1em', fontSize: 11 }}
              >
                这张卡片是怎么来的
              </summary>
              <div className="trace" style={{ marginTop: 14 }}>
                <div className="trace-head">
                  <span className="dot-pulse" />
                  意图识别 · {p.signals.engine}
                </div>
                <div className="trace-body">
                  <div className="trace-line">
                    <span className="k">仓库</span>
                    <span className="v">{p.signals.repo}</span>
                  </div>
                  <div className="trace-line">
                    <span className="k">主语言</span>
                    <span className="v">
                      {p.signals.language ?? '未知'}
                      {p.signals.languages
                        ? ` · ${Object.keys(p.signals.languages).slice(0, 3).join(' / ')}`
                        : ''}
                    </span>
                  </div>
                  <div className="trace-line">
                    <span className="k">依赖清单</span>
                    <span className="v">{p.signals.manifests.join(' · ') || '未发现'}</span>
                  </div>
                  <div className="trace-line">
                    <span className="k">文件树</span>
                    <span className="v">{p.signals.fileCount ?? 0} 个文件</span>
                  </div>
                  <div className="trace-line">
                    <span className="k">README</span>
                    <span className="v">{p.signals.readmeChars} 字符</span>
                  </div>
                  <div className="trace-line">
                    <span className="k">命中能力</span>
                    <span className="v">
                      {p.signals.keywordHits.map((k) => k.label).join(' · ') || '无'}
                    </span>
                  </div>
                  <div className="trace-line">
                    <span className="k">分类打分</span>
                    <span className="v">
                      {p.signals.categoryScores
                        .map((s) => `${s.category} ${s.score}`)
                        .join(' / ')}
                    </span>
                  </div>
                </div>
              </div>
            </details>
          ) : null}
        </div>

        <aside>
          <div className="side-panel">
            <div className="eyebrow" style={{ marginBottom: 8 }}>
              信息
            </div>
            <dl style={{ margin: 0 }}>
              <div className="kv">
                <dt>作者空间</dt>
                <dd>
                  <Link href={`/${t.handle}`}>{t.name}</Link>
                </dd>
              </div>
              <div className="kv">
                <dt>分类</dt>
                <dd>{p.category}</dd>
              </div>
              <div className="kv">
                <dt>技术栈</dt>
                <dd>{p.stack.join(' · ') || '—'}</dd>
              </div>
              {p.language ? (
                <div className="kv">
                  <dt>语言</dt>
                  <dd>{p.language}</dd>
                </div>
              ) : null}
              {p.stars != null ? (
                <div className="kv">
                  <dt>Star</dt>
                  <dd>{compactNumber(p.stars)}</dd>
                </div>
              ) : null}
              {p.license ? (
                <div className="kv">
                  <dt>许可</dt>
                  <dd>{p.license}</dd>
                </div>
              ) : null}
              <div className="kv">
                <dt>上架</dt>
                <dd>{timeAgo(p.publishedAt)}</dd>
              </div>
              {p.signals?.audit?.score != null ? (
                <div className="kv">
                  <dt>核对分</dt>
                  <dd>{p.signals.audit.score} / 100</dd>
                </div>
              ) : null}
              {p.lastScanAt ? (
                <div className="kv">
                  <dt>上次扫描</dt>
                  <dd>{timeAgo(p.lastScanAt)}</dd>
                </div>
              ) : null}
            </dl>

            <div className="stack-8" style={{ marginTop: 20 }}>
              {p.demoUrl ? (
                <a className="btn small" href={p.demoUrl} target="_blank" rel="noreferrer" style={{ width: '100%', justifyContent: 'center' }}>
                  打开演示 ↗
                </a>
              ) : null}
              {p.repoUrl ? (
                <a
                  className="btn ghost small"
                  href={p.repoUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={{ width: '100%', justifyContent: 'center' }}
                >
                  查看源码 ↗
                </a>
              ) : null}
              <Link
                className="btn ghost small"
                href={`/${t.handle}/agent-card`}
                style={{ width: '100%', justifyContent: 'center' }}
              >
                这个空间的 Agent Card
              </Link>
            </div>
          </div>
        </aside>
      </section>

      {related.length ? (
        <section className="section">
          <div className="wrap">
            <div className="section-head">
              <div>
                <div className="eyebrow">More in {p.category}</div>
                <h2 className="h2">同类作品</h2>
              </div>
              <Link className="btn ghost small" href="/explore">
                全部作品 →
              </Link>
            </div>
            <div className="grid">
              {related.map((r) => (
                <ProjectCard
                  key={r.id}
                  project={r}
                  href={`/${tenantById.get(r.tenantId)?.handle ?? 'u'}/${r.slug}`}
                  showTenant={tenantById.get(r.tenantId)?.name}
                />
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </>
  )
}
