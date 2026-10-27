'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { CoverArt } from '@/components/cover-art'
import { AuditBlock } from '@/components/audit-block'
import type { AnalysisSignals, Draft } from '@/lib/types'

const CATEGORIES = ['AI 基础设施', '智能体', '检索与数据', '开发工具', '效率工具', '前端与界面']
const GLYPHS = ['◆', '◈', '◎', '◍', '◇', '▤', '⌘', '❖', '✦', '⬢']
const ACCENTS = ['#3F5D8C', '#8C4A3F', '#4A6B52', '#7A5C2E', '#5B5A8C', '#8C6A3F', '#2F5F63', '#7A3F5C']

const STEPS = [
  '解析仓库地址',
  '拉取元信息与 topics',
  '读取 README 正文',
  '扫描依赖清单与目录',
  '语义分类 · 能力识别',
  '生成卡片文案',
]

interface Form {
  name: string
  nameEn: string
  tagline: string
  summary: string
  highlights: string
  tags: string
  stack: string
  category: string
  demoUrl: string
  cover: string
  glyph: string
  accent: string
}

const emptyForm: Form = {
  name: '',
  nameEn: '',
  tagline: '',
  summary: '',
  highlights: '',
  tags: '',
  stack: '',
  category: CATEGORIES[0],
  demoUrl: '',
  cover: '',
  glyph: '◆',
  accent: '#B8442F',
}

export function SubmitClient({ me }: { me: { handle: string; name: string } | null }) {
  const router = useRouter()
  const [url, setUrl] = useState('')
  const [phase, setPhase] = useState<'idle' | 'analyzing' | 'review' | 'publishing'>('idle')
  const [step, setStep] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [warnings, setWarnings] = useState<string[]>([])
  const [draft, setDraft] = useState<Draft | null>(null)
  const [form, setForm] = useState<Form>(emptyForm)
  const [signup, setSignup] = useState({ handle: '', name: '', pass: '' })
  const [needSpace, setNeedSpace] = useState(false)
  const [published, setPublished] = useState<{ handle: string; slug: string } | null>(null)
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (phase !== 'analyzing') {
      if (timer.current) clearInterval(timer.current)
      return
    }
    setStep(0)
    setElapsed(0)
    timer.current = setInterval(() => {
      setElapsed((e) => e + 1)
      setStep((s) => (s < STEPS.length - 1 ? s + 1 : s))
    }, 720)
    return () => {
      if (timer.current) clearInterval(timer.current)
    }
  }, [phase])

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }))

  async function analyze(e?: React.FormEvent) {
    e?.preventDefault()
    if (!url.trim()) return
    setPhase('analyzing')
    setError(null)
    setWarnings([])
    setDraft(null)
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '识别失败')
      const d: Draft = data.draft
      setDraft(d)
      setWarnings(data.warnings ?? [])
      setForm({
        name: d.name,
        nameEn: d.nameEn ?? '',
        tagline: d.tagline,
        summary: d.summary,
        highlights: d.highlights.join('\n'),
        tags: d.tags.join('、'),
        stack: d.stack.join('、'),
        category: d.category,
        demoUrl: d.demoUrl ?? '',
        cover: '',
        glyph: d.glyph,
        accent: d.accent,
      })
      setStep(STEPS.length)
      setPhase('review')
    } catch (err) {
      setError(err instanceof Error ? err.message : '识别失败')
      setPhase('idle')
    }
  }

  async function publish() {
    if (!draft) return
    setPhase('publishing')
    setError(null)
    try {
      const payload = {
        name: form.name,
        nameEn: form.nameEn,
        tagline: form.tagline,
        summary: form.summary,
        highlights: form.highlights.split('\n').map((s) => s.trim()).filter(Boolean),
        tags: form.tags.split(/[、,，]/).map((s) => s.trim()).filter(Boolean),
        stack: form.stack.split(/[、,，]/).map((s) => s.trim()).filter(Boolean),
        category: form.category,
        demoUrl: form.demoUrl,
        cover: form.cover,
        glyph: form.glyph,
        accent: form.accent,
        repoUrl: draft.repoUrl,
        stars: draft.stars,
        license: draft.license,
        language: draft.language,
        source: 'github-ai',
        engine: draft.signals.engine,
        signals: draft.signals,
      }
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (res.status === 401) {
        setNeedSpace(true)
        setPhase('review')
        return
      }
      if (!res.ok) throw new Error(data.error || '发布失败')
      setPublished({ handle: me?.handle ?? '', slug: data.project.slug })
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : '发布失败')
      setPhase('review')
    }
  }

  async function createSpaceAndPublish() {
    setError(null)
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(signup),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '开通失败')
      setNeedSpace(false)
      const p = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          nameEn: form.nameEn,
          tagline: form.tagline,
          summary: form.summary,
          highlights: form.highlights.split('\n').filter(Boolean),
          tags: form.tags.split(/[、,，]/).filter(Boolean),
          stack: form.stack.split(/[、,，]/).filter(Boolean),
          category: form.category,
          demoUrl: form.demoUrl,
          glyph: form.glyph,
          accent: form.accent,
          repoUrl: draft?.repoUrl,
          stars: draft?.stars,
          license: draft?.license,
          language: draft?.language,
          source: 'github-ai',
          engine: draft?.signals.engine,
          signals: draft?.signals,
        }),
      })
      const pd = await p.json()
      if (!p.ok) throw new Error(pd.error || '发布失败')
      setPublished({ handle: data.tenant.handle, slug: pd.project.slug })
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : '开通失败')
    }
  }

  const previewProject = useMemo(
    () => ({
      id: draft?.repoUrl ?? 'preview',
      name: form.name || '未命名作品',
      nameEn: form.nameEn,
      tagline: form.tagline || '一句话说明它在解决什么问题',
      category: form.category,
      glyph: form.glyph,
      accent: form.accent,
      cover: form.cover || null,
      stack: form.stack.split(/[、,，]/).filter(Boolean).slice(0, 3),
    }),
    [form, draft],
  )

  if (published) {
    return (
      <div className="wrap" style={{ padding: '72px 32px 100px', maxWidth: 760 }}>
        <div className="eyebrow">Published</div>
        <h1 className="display" style={{ fontSize: 42, marginTop: 14 }}>
          已经摆上货架了。
        </h1>
        <p className="lede" style={{ marginTop: 16 }}>
          「{form.name}」已经出现在你的空间里。接下来随时可以回去改文案、换封面、调整分类。
        </p>
        <div style={{ maxWidth: 320, marginTop: 30 }}>
          <PreviewCard project={previewProject} />
        </div>
        <div className="row" style={{ marginTop: 30 }}>
          <Link className="btn" href={`/${published.handle}/${published.slug}`}>
            看看这一页
          </Link>
          <Link className="btn ghost" href="/studio">
            回管理台
          </Link>
          <button
            className="btn ghost"
            onClick={() => {
              setPublished(null)
              setDraft(null)
              setForm(emptyForm)
              setUrl('')
              setPhase('idle')
            }}
          >
            再传一个
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="wrap" style={{ padding: '56px 32px 90px' }}>
      <div style={{ maxWidth: 660 }}>
        <div className="eyebrow">Submit · AI 意图识别</div>
        <h1 className="display" style={{ fontSize: 'clamp(32px,4.4vw,50px)', marginTop: 14 }}>
          贴一个仓库，
          <span className="accent-line">
            剩下的<em>交给它</em>
          </span>
        </h1>
        <p className="lede" style={{ marginTop: 18 }}>
          不用先想好怎么写介绍。给出 GitHub 地址，它会读 README、看目录、翻依赖清单，
          判断这个项目到底是什么，然后写成一页作品集。
        </p>
      </div>

      <form onSubmit={analyze} className="row" style={{ marginTop: 32, gap: 10, maxWidth: 720 }}>
        <input
          className="input input-inline"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://github.com/owner/repo  或  owner/repo"
          style={{ minWidth: 260, height: 44 }}
          disabled={phase === 'analyzing'}
        />
        <button className="btn" type="submit" disabled={phase === 'analyzing' || !url.trim()} style={{ height: 44 }}>
          {phase === 'analyzing' ? '识别中…' : '开始识别'}
        </button>
      </form>
      <div className="help" style={{ marginTop: 8 }}>
        公开仓库可直接识别；私有仓库需要配置 GITHUB_TOKEN。当前引擎：
        <span className="mono" style={{ marginLeft: 6 }}>
          {draft ? draft.signals.engine : '待定（有 LLM_API_KEY 走大模型，否则本地语义解析）'}
        </span>
      </div>

      <div className="row" style={{ marginTop: 14, gap: 6 }}>
        <span className="mono muted" style={{ fontSize: 10.5, letterSpacing: '0.1em' }}>
          试试
        </span>
        {[
          'RiemannChow/agent-hub',
          'RiemannChow/nantianmen-ai-gateway',
          'modelcontextprotocol/servers',
        ].map((sample) => (
          <button
            key={sample}
            type="button"
            className="filter-chip"
            style={{ height: 26, fontSize: 11.5 }}
            onClick={() => setUrl(sample)}
            disabled={phase === 'analyzing'}
          >
            {sample}
          </button>
        ))}
      </div>

      {phase === 'idle' ? (
        <div className="steps" style={{ marginTop: 52, maxWidth: 980 }}>
          <div className="step">
            <div className="step-num">READS</div>
            <h3>README 全文</h3>
            <p>剥掉徽章、图片与表格，只留标题、段落与小标题，用来判断它到底在讲什么。</p>
          </div>
          <div className="step">
            <div className="step-num">SCANS</div>
            <h3>目录与依赖清单</h3>
            <p>pom.xml、go.mod、package.json、docker-compose —— 从依赖反推真实技术栈，而不是猜。</p>
          </div>
          <div className="step">
            <div className="step-num">JUDGES</div>
            <h3>能力与分类</h3>
            <p>把命中的能力点加权打分，落到六个分类里；每个判断都能在「识别信号」里回溯。</p>
          </div>
        </div>
      ) : null}

      {error ? (
        <div className="notice" style={{ marginTop: 22, maxWidth: 720 }}>
          {error}
        </div>
      ) : null}

      {phase === 'analyzing' ? (
        <div className="trace fade-up" style={{ marginTop: 28, maxWidth: 720 }}>
          <div className="trace-head">
            <span className="dot-pulse" />
            正在读这个仓库 · {elapsed}s
          </div>
          <div className="trace-body">
            {STEPS.map((s, i) => (
              <div className="trace-line" key={s} style={{ opacity: i <= step ? 1 : 0.32 }}>
                <span className="k">{i <= step ? '✓' : '·'}</span>
                <span className="v">{s}</span>
              </div>
            ))}
            <div className="bar">
              <i style={{ width: `${Math.min(100, ((step + 1) / STEPS.length) * 100)}%` }} />
            </div>
          </div>
        </div>
      ) : null}

      {phase !== 'analyzing' && draft ? (
        <div
          className="fade-up"
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0,1.35fr) minmax(0,1fr)',
            gap: 40,
            marginTop: 40,
            alignItems: 'start',
          }}
        >
          <div>
            <div className="between" style={{ marginBottom: 18 }}>
              <h2 className="h2" style={{ fontSize: 24 }}>
                识别结果，逐项可改
              </h2>
              <span className="pill accent">{draft.signals.engine}</span>
            </div>

            {warnings.length ? (
              <div className="notice neutral" style={{ marginBottom: 20 }}>
                {warnings.map((w, i) => (
                  <div key={i}>{w}</div>
                ))}
              </div>
            ) : null}

            {draft.signals.audit ? (
              <div style={{ marginBottom: 24 }}>
                <AuditBlock audit={draft.signals.audit} />
                {draft.signals.audit.evidenceOnly.length ? (
                  <div className="between" style={{ marginTop: 10, gap: 12 }}>
                    <span className="help" style={{ margin: 0 }}>
                      这些能力点在仓库里有痕迹，但 README 没写。要补进亮点吗？
                    </span>
                    <button
                      type="button"
                      className="btn ghost small"
                      onClick={() => {
                        const existing = form.highlights
                          .split('\n')
                          .map((s) => s.trim())
                          .filter(Boolean)
                        const add = draft.signals.audit!.evidenceOnly
                          .map((e) => e.label)
                          .filter((l) => !existing.includes(l))
                        set('highlights', [...existing, ...add].join('\n'))
                      }}
                    >
                      补进去（+{draft.signals.audit.evidenceOnly.length}）
                    </button>
                  </div>
                ) : null}
              </div>
            ) : null}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <label className="field">
                <span>作品名</span>
                <input className="input" value={form.name} onChange={(e) => set('name', e.target.value)} />
              </label>
              <label className="field">
                <span>英文名 / 仓库名</span>
                <input className="input" value={form.nameEn} onChange={(e) => set('nameEn', e.target.value)} />
              </label>
            </div>

            <label className="field">
              <span>一句话定位</span>
              <input className="input" value={form.tagline} onChange={(e) => set('tagline', e.target.value)} />
            </label>

            <label className="field">
              <span>简介</span>
              <textarea
                className="textarea"
                value={form.summary}
                onChange={(e) => set('summary', e.target.value)}
                rows={4}
              />
            </label>

            <label className="field">
              <span>能做的事（每行一条）</span>
              <textarea
                className="textarea"
                value={form.highlights}
                onChange={(e) => set('highlights', e.target.value)}
                rows={5}
              />
            </label>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <label className="field">
                <span>标签（顿号分隔）</span>
                <input className="input" value={form.tags} onChange={(e) => set('tags', e.target.value)} />
              </label>
              <label className="field">
                <span>技术栈</span>
                <input className="input" value={form.stack} onChange={(e) => set('stack', e.target.value)} />
              </label>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <label className="field">
                <span>分类</span>
                <select
                  className="input"
                  value={form.category}
                  onChange={(e) => set('category', e.target.value)}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>演示地址（可选）</span>
                <input className="input" value={form.demoUrl} onChange={(e) => set('demoUrl', e.target.value)} />
              </label>
            </div>

            <label className="field">
              <span>封面图地址（可选，留空用自动版画）</span>
              <input
                className="input"
                value={form.cover}
                onChange={(e) => set('cover', e.target.value)}
                placeholder="/covers/xxx.png 或 https://…"
              />
            </label>

            <div className="field">
              <span>图标与主色</span>
              <div className="row" style={{ gap: 6 }}>
                {GLYPHS.map((g) => (
                  <button
                    type="button"
                    key={g}
                    onClick={() => set('glyph', g)}
                    className="filter-chip"
                    data-active={form.glyph === g}
                    style={{ width: 34, padding: 0, justifyContent: 'center' }}
                  >
                    {g}
                  </button>
                ))}
              </div>
              <div className="row" style={{ gap: 6, marginTop: 10 }}>
                {ACCENTS.map((a) => (
                  <button
                    type="button"
                    key={a}
                    onClick={() => set('accent', a)}
                    aria-label={a}
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 7,
                      background: a,
                      border: form.accent === a ? '2px solid var(--ink)' : '1px solid var(--line)',
                    }}
                  />
                ))}
              </div>
            </div>

            {needSpace ? (
              <div className="notice" style={{ marginTop: 20 }}>
                <div style={{ marginBottom: 10 }}>要上架得先有一个空间。填两格，三十秒开好：</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                  <input
                    className="input"
                    placeholder="空间地址 riemann"
                    value={signup.handle}
                    onChange={(e) => setSignup((s) => ({ ...s, handle: e.target.value }))}
                  />
                  <input
                    className="input"
                    placeholder="显示名"
                    value={signup.name}
                    onChange={(e) => setSignup((s) => ({ ...s, name: e.target.value }))}
                  />
                  <input
                    className="input"
                    placeholder="口令（可留空）"
                    value={signup.pass}
                    onChange={(e) => setSignup((s) => ({ ...s, pass: e.target.value }))}
                  />
                </div>
                <button
                  type="button"
                  className="btn small"
                  style={{ marginTop: 10 }}
                  onClick={createSpaceAndPublish}
                >
                  开好并上架
                </button>
              </div>
            ) : null}

            <div className="row" style={{ marginTop: 24, gap: 10 }}>
              <button
                className="btn"
                onClick={publish}
                disabled={phase === 'publishing' || !form.name.trim()}
              >
                {phase === 'publishing' ? '上架中…' : me ? `发布到「${me.name}」的空间` : '发布'}
              </button>
              <button
                className="btn ghost"
                onClick={() => {
                  setDraft(null)
                  setPhase('idle')
                }}
              >
                重新识别
              </button>
            </div>
          </div>

          <div>
            <div className="eyebrow" style={{ marginBottom: 12 }}>
              预览
            </div>
            <PreviewCard project={previewProject} />

            <Trace signals={draft.signals} />
          </div>
        </div>
      ) : null}
    </div>
  )
}

function PreviewCard({
  project,
}: {
  project: {
    id: string
    name: string
    nameEn: string
    tagline: string
    category: string
    glyph: string
    accent: string
    cover: string | null
    stack: string[]
  }
}) {
  return (
    <div className="card" style={{ pointerEvents: 'none' }}>
      <div className="card-cover">
        <CoverArt
          seed={project.id}
          accent={project.accent}
          glyph={project.glyph}
          label={project.category}
          image={project.cover}
          name={project.name}
        />
      </div>
      <div className="card-body">
        <div className="card-title">
          <span>{project.name}</span>
          <span className="arrow">→</span>
        </div>
        {project.nameEn ? <div className="card-name-en">{project.nameEn}</div> : null}
        <p className="card-tagline">{project.tagline}</p>
        <div className="card-foot">
          {project.stack.map((s) => (
            <span className="pill" key={s}>
              {s}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

function Trace({ signals }: { signals: AnalysisSignals }) {
  return (
    <div className="trace" style={{ marginTop: 22 }}>
      <div className="trace-head">
        <span className="dot-pulse" />
        识别信号
      </div>
      <div className="trace-body">
        <Line k="仓库" v={signals.repo} />
        <Line k="语言" v={`${signals.language ?? '未知'}`} />
        <Line k="Stars" v={String(signals.stars ?? 0)} />
        <Line k="License" v={signals.license ?? '未声明'} />
        <Line k="依赖清单" v={signals.manifests.join(' · ') || '未发现'} />
        <Line k="文件树" v={`${signals.fileCount ?? 0} 个文件`} />
        <Line k="README" v={`${signals.readmeChars} 字符`} />
        <Line k="能力命中" v={signals.keywordHits.map((k) => k.label).join(' · ') || '无'} />
        <div>
          <div className="mono muted" style={{ fontSize: 10.5, letterSpacing: '0.1em', marginBottom: 6 }}>
            分类打分
          </div>
          {signals.categoryScores.slice(0, 3).map((s) => {
            const max = Math.max(...signals.categoryScores.map((x) => x.score), 1)
            return (
              <div key={s.category} style={{ marginBottom: 7 }}>
                <div className="between" style={{ fontSize: 11 }}>
                  <span>{s.category}</span>
                  <span className="muted">{s.score}</span>
                </div>
                <div className="bar">
                  <i style={{ width: `${(s.score / max) * 100}%` }} />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function Line({ k, v }: { k: string; v: string }) {
  return (
    <div className="trace-line">
      <span className="k">{k}</span>
      <span className="v">{v}</span>
    </div>
  )
}
