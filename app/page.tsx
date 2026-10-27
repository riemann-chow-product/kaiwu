import Link from 'next/link'
import { listProjects, listTenants, stats } from '@/lib/db'
import { ProjectCard } from '@/components/project-card'
import { CoverArt } from '@/components/cover-art'
import { compactNumber } from '@/lib/format'

export const dynamic = 'force-dynamic'

export default function HomePage() {
  const featured = listProjects({ limit: 6 })
  const tenants = listTenants()
  const s = stats()
  const tiles = featured.slice(0, 4)
  const tenantById = new Map(tenants.map((t) => [t.id, t]))

  return (
    <>
      <section className="hero">
        <div className="wrap hero-grid">
          <div>
            <div className="eyebrow">多租户 · 作品空间 · AI 上架</div>
            <h1 className="display" style={{ marginTop: 18 }}>
              做过的东西，
              <span className="accent-line">
                摆成<em>一个空间</em>
              </span>
            </h1>
            <p className="hero-lede">
              这里不只是我一个人的作品集。每个人都能开一个自己的空间，把工具、项目、实验摆进来；
              懒得写介绍就贴一个 GitHub 地址，AI 读完代码替你写好。
            </p>
            <div className="hero-actions">
              <Link className="btn" href="/submit">
                贴个仓库，试试 AI 上架
              </Link>
              <Link className="btn ghost" href="/explore">
                逛逛全部作品
              </Link>
            </div>
            <div className="hero-stats">
              <div>
                <div className="hero-stat-num">{s.projects}</div>
                <div className="hero-stat-label">件作品</div>
              </div>
              <div>
                <div className="hero-stat-num">{s.tenants}</div>
                <div className="hero-stat-label">个空间</div>
              </div>
              <div>
                <div className="hero-stat-num">{s.categories}</div>
                <div className="hero-stat-label">个分类</div>
              </div>
            </div>
          </div>

          <div className="hero-visual">
            {tiles.map((p) => (
              <div className="mini-tile" key={p.id}>
                <CoverArt
                  seed={p.id}
                  accent={p.accent}
                  glyph={p.glyph}
                  label={p.category}
                  image={p.cover}
                  name={p.name}
                />
              </div>
            ))}
            {tiles.length < 4 ? (
              <Link
                href="/join"
                className="mini-tile"
                style={{
                  display: 'grid',
                  placeItems: 'center',
                  borderStyle: 'dashed',
                  background: 'transparent',
                }}
              >
                <span className="mono muted" style={{ fontSize: 10.5, letterSpacing: '0.12em' }}>
                  把你的作品放进来 →
                </span>
              </Link>
            ) : null}
            {tiles.length < 3 ? (
              <div
                className="mini-tile"
                style={{ display: 'grid', placeItems: 'center', background: 'var(--paper-2)' }}
                aria-hidden="true"
              >
                <span
                  className="mono muted"
                  style={{ fontSize: 10.5, letterSpacing: '0.14em', textAlign: 'center', lineHeight: 2 }}
                >
                  贴一个仓库
                  <br />
                  AI 读完代码
                  <br />
                  自动写介绍
                </span>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <div className="section-head">
            <div>
              <div className="eyebrow">Selected works</div>
              <h2 className="h2">最近摆上货架的</h2>
            </div>
            <Link className="btn ghost small" href="/explore">
              全部作品 →
            </Link>
          </div>

          {featured.length === 0 ? (
            <div className="empty">
              货架还是空的。去 <Link href="/submit" style={{ color: 'var(--accent)' }}>提交第一件作品</Link> 吧。
            </div>
          ) : (
            <div className={featured.length <= 2 ? 'grid two' : 'grid'}>
              {featured.map((p) => (
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

      <section className="section">
        <div className="wrap">
          <div className="section-head">
            <div>
              <div className="eyebrow">How it works</div>
              <h2 className="h2">三步，把仓库变成一张卡片</h2>
            </div>
          </div>
          <div className="steps">
            <div className="step">
              <div className="step-num">STEP 01</div>
              <h3>贴地址</h3>
              <p>
                粘贴 GitHub 仓库链接，或直接写 <code className="mono">owner/repo</code>。不需要提前准备任何素材。
              </p>
            </div>
            <div className="step">
              <div className="step-num">STEP 02</div>
              <h3>AI 读代码</h3>
              <p>
                抓取 README、目录结构、依赖清单与 topics，识别这个项目到底在解决什么问题，归到哪一类。
              </p>
            </div>
            <div className="step">
              <div className="step-num">STEP 03</div>
              <h3>确认上架</h3>
              <p>
                生成中文名、一句话定位、亮点与标签。你可以逐项改，确认后立刻出现在你的空间里。
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <div className="section-head">
            <div>
              <div className="eyebrow">Spaces</div>
              <h2 className="h2">谁在这里摆了东西</h2>
            </div>
            <Link className="btn ghost small" href="/join">
              开通我的空间 →
            </Link>
          </div>
          <div>
            {tenants.map((t) => (
              <Link key={t.id} href={`/${t.handle}`} className="tenant-row">
                <div className="row" style={{ gap: 14 }}>
                  <span
                    className="tenant-avatar"
                    style={{ background: `${t.accent}14`, color: t.accent }}
                  >
                    {t.glyph}
                  </span>
                  <span>
                    <span style={{ fontFamily: 'var(--serif)', fontSize: 17 }}>{t.name}</span>
                    <span className="mono muted" style={{ marginLeft: 10 }}>
                      @{t.handle}
                    </span>
                    <span style={{ display: 'block', fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>
                      {t.title || '还没有写介绍'}
                    </span>
                  </span>
                </div>
                <span className="mono muted">{t.count} 件作品 →</span>
              </Link>
            ))}
            {tenants.length === 0 ? <div className="empty">还没有空间。</div> : null}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="wrap between">
          <div>
            <h2 className="h2">你的仓库，也可以现在就上架。</h2>
            <p className="lede" style={{ marginTop: 14 }}>
              不管是一个自用的小工具，还是一个跑了半年的平台，都值得有一个像样的介绍页。
            </p>
          </div>
          <div className="row">
            <Link className="btn" href="/submit">
              提交作品
            </Link>
            <Link className="btn ghost" href="/join">
              开通空间
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}
