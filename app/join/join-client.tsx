'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

const GLYPHS = ['◆', '◈', '◎', '◍', '◇', '▤', '⌘', '❖', '✦', '⬢']
const ACCENTS = ['#B8442F', '#3F5D8C', '#4A6B52', '#7A5C2E', '#5B5A8C', '#8C6A3F', '#2F5F63', '#7A3F5C']

export function JoinClient({ next }: { next: string }) {
  const router = useRouter()
  const [tab, setTab] = useState<'create' | 'login'>('create')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [f, setF] = useState({
    handle: '',
    name: '',
    title: '',
    bio: '',
    glyph: '◆',
    accent: '#B8442F',
    github: '',
    pass: '',
  })
  const [login, setLogin] = useState({ handle: '', pass: '' })

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(tab === 'create' ? '/api/auth/register' : '/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tab === 'create' ? f : login),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '操作失败')
      router.push(next || '/studio')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : '操作失败')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="wrap" style={{ padding: '60px 32px 96px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 64, alignItems: 'start' }}>
        <div>
          <div className="eyebrow">Space</div>
          <h1 className="display" style={{ fontSize: 'clamp(30px,4vw,44px)', marginTop: 14 }}>
            开一个属于你的
            <span className="accent-line">
              <em>空间</em>
            </span>
          </h1>
          <p className="lede" style={{ marginTop: 18 }}>
            一个地址、一页作品集、一个后台。作品可以手工填，也可以直接贴 GitHub 地址让 AI 写。
            空间之间彼此独立，你只管自己的货架。
          </p>
          <div className="stack-16" style={{ marginTop: 30 }}>
            <div className="row" style={{ gap: 10, alignItems: 'flex-start' }}>
              <span style={{ color: 'var(--accent)' }}>—</span>
              <span style={{ fontSize: 14, color: 'var(--ink-soft)' }}>
                独立地址 <span className="mono">kaiwu.dev/你的名字</span>，直接可以分享
              </span>
            </div>
            <div className="row" style={{ gap: 10, alignItems: 'flex-start' }}>
              <span style={{ color: 'var(--accent)' }}>—</span>
              <span style={{ fontSize: 14, color: 'var(--ink-soft)' }}>贴仓库自动生成卡片，也能逐字改</span>
            </div>
            <div className="row" style={{ gap: 10, alignItems: 'flex-start' }}>
              <span style={{ color: 'var(--accent)' }}>—</span>
              <span style={{ fontSize: 14, color: 'var(--ink-soft)' }}>
                口令保护后台；留空则任何人都能改（仅适合本地演示）
              </span>
            </div>
          </div>
          <div className="notice neutral" style={{ marginTop: 28 }}>
            已经有空间了？切到右边「登录已有空间」，填空间地址即可。
          </div>
        </div>

        <div className="side-panel" style={{ position: 'static' }}>
          <div className="row" style={{ gap: 6, marginBottom: 20 }}>
            <button className="filter-chip" data-active={tab === 'create'} onClick={() => setTab('create')}>
              开通新空间
            </button>
            <button className="filter-chip" data-active={tab === 'login'} onClick={() => setTab('login')}>
              登录已有空间
            </button>
          </div>

          <form onSubmit={submit}>
            {tab === 'create' ? (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <label className="field">
                    <span>空间地址</span>
                    <input
                      className="input"
                      value={f.handle}
                      onChange={(e) => setF({ ...f, handle: e.target.value.toLowerCase() })}
                      placeholder="riemann"
                      required
                    />
                  </label>
                  <label className="field">
                    <span>显示名</span>
                    <input
                      className="input"
                      value={f.name}
                      onChange={(e) => setF({ ...f, name: e.target.value })}
                      placeholder="周鹏"
                      required
                    />
                  </label>
                </div>
                <label className="field">
                  <span>一句话介绍</span>
                  <input
                    className="input"
                    value={f.title}
                    onChange={(e) => setF({ ...f, title: e.target.value })}
                    placeholder="把复杂的东西做简单"
                  />
                </label>
                <label className="field">
                  <span>自我介绍</span>
                  <textarea
                    className="textarea"
                    rows={3}
                    value={f.bio}
                    onChange={(e) => setF({ ...f, bio: e.target.value })}
                    placeholder="在做什么、关心什么"
                  />
                </label>
                <label className="field">
                  <span>GitHub</span>
                  <input
                    className="input"
                    value={f.github}
                    onChange={(e) => setF({ ...f, github: e.target.value })}
                    placeholder="https://github.com/…"
                  />
                </label>
                <div className="field">
                  <span>图标与主色</span>
                  <div className="row" style={{ gap: 5 }}>
                    {GLYPHS.map((g) => (
                      <button
                        type="button"
                        key={g}
                        className="filter-chip"
                        data-active={f.glyph === g}
                        style={{ width: 32, padding: 0, justifyContent: 'center' }}
                        onClick={() => setF({ ...f, glyph: g })}
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
                        onClick={() => setF({ ...f, accent: a })}
                        style={{
                          width: 22,
                          height: 22,
                          borderRadius: 6,
                          background: a,
                          border: f.accent === a ? '2px solid var(--ink)' : '1px solid var(--line)',
                        }}
                      />
                    ))}
                  </div>
                </div>
                <label className="field">
                  <span>后台口令（可留空）</span>
                  <input
                    className="input"
                    type="password"
                    value={f.pass}
                    onChange={(e) => setF({ ...f, pass: e.target.value })}
                    placeholder="留空 = 演示空间，谁都能进后台"
                  />
                </label>
              </>
            ) : (
              <>
                <label className="field">
                  <span>空间地址</span>
                  <input
                    className="input"
                    value={login.handle}
                    onChange={(e) => setLogin({ ...login, handle: e.target.value.toLowerCase() })}
                    placeholder="riemann"
                    required
                  />
                </label>
                <label className="field">
                  <span>口令</span>
                  <input
                    className="input"
                    type="password"
                    value={login.pass}
                    onChange={(e) => setLogin({ ...login, pass: e.target.value })}
                    placeholder="没设口令就留空"
                  />
                </label>
              </>
            )}

            {error ? (
              <div className="notice" style={{ marginBottom: 14 }}>
                {error}
              </div>
            ) : null}

            <button className="btn" type="submit" disabled={busy} style={{ width: '100%', justifyContent: 'center' }}>
              {busy ? '处理中…' : tab === 'create' ? '开通空间' : '登录'}
            </button>
          </form>

          <div className="help" style={{ marginTop: 12 }}>
            开通后可以直接去 <Link href="/submit" style={{ color: 'var(--accent)' }}>提交作品</Link>。
          </div>
        </div>
      </div>
    </div>
  )
}
