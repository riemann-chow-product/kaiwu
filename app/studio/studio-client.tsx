'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { Project, Tenant } from '@/lib/types'
import { timeAgo } from '@/lib/format'

const CATEGORIES = ['AI 基础设施', '智能体', '检索与数据', '开发工具', '效率工具', '前端与界面']
const GLYPHS = ['◆', '◈', '◎', '◍', '◇', '▤', '⌘', '❖', '✦', '⬢']
const ACCENTS = ['#B8442F', '#3F5D8C', '#8C4A3F', '#4A6B52', '#7A5C2E', '#5B5A8C', '#8C6A3F', '#2F5F63', '#7A3F5C']

export function StudioClient({ tenant, projects }: { tenant: Tenant; projects: Project[] }) {
  const router = useRouter()
  const [editing, setEditing] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [space, setSpace] = useState({
    name: tenant.name,
    title: tenant.title,
    bio: tenant.bio,
    glyph: tenant.glyph,
    accent: tenant.accent,
    github: tenant.github ?? '',
    website: tenant.website ?? '',
  })
  const [spaceMsg, setSpaceMsg] = useState<string | null>(null)
  const [scanMsg, setScanMsg] = useState<{ id: string; text: string } | null>(null)
  const [origin, setOrigin] = useState('')
  useEffect(() => setOrigin(window.location.origin), [])

  async function saveSpace() {
    setBusy('space')
    const res = await fetch('/api/tenants', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(space),
    })
    setBusy(null)
    setSpaceMsg(res.ok ? '已保存' : '保存失败')
    router.refresh()
    setTimeout(() => setSpaceMsg(null), 2400)
  }

  async function patch(id: string, body: Record<string, unknown>) {
    setBusy(id)
    await fetch(`/api/projects/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    setBusy(null)
    router.refresh()
  }

  async function remove(id: string, name: string) {
    if (!confirm(`确定把「${name}」从空间里删掉？这个操作不可撤销。`)) return
    setBusy(id)
    await fetch(`/api/projects/${id}`, { method: 'DELETE' })
    setBusy(null)
    router.refresh()
  }

  async function rescan(id: string, name: string) {
    setBusy(id)
    setScanMsg(null)
    try {
      const res = await fetch(`/api/projects/${id}/rescan`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '重扫失败')
      const n = data.changes?.length ?? 0
      setScanMsg({
        id,
        text: n ? `「${name}」有 ${n} 处变化，已记进作品动态` : `「${name}」没有变化`,
      })
      router.refresh()
    } catch (e) {
      setScanMsg({ id, text: e instanceof Error ? e.message : '重扫失败' })
    } finally {
      setBusy(null)
    }
  }

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/')
    router.refresh()
  }

  const published = projects.filter((p) => p.status === 'published').length
  const drafts = projects.filter((p) => p.status === 'draft').length

  return (
    <div className="wrap" style={{ padding: '48px 32px 90px' }}>
      <div className="between" style={{ alignItems: 'flex-start' }}>
        <div className="row" style={{ gap: 16, alignItems: 'flex-start' }}>
          <span
            className="tenant-avatar"
            style={{
              width: 54,
              height: 54,
              borderRadius: 14,
              fontSize: 23,
              background: `${tenant.accent}14`,
              color: tenant.accent,
            }}
          >
            {tenant.glyph}
          </span>
          <div>
            <div className="eyebrow">Studio · @{tenant.handle}</div>
            <h1 className="detail-title" style={{ fontSize: 34, marginTop: 6 }}>
              管理台
            </h1>
            <div className="row" style={{ marginTop: 10, gap: 16 }}>
              <span className="mono muted">{published} 已上架</span>
              {drafts ? <span className="mono muted">{drafts} 草稿</span> : null}
              <Link className="mono muted" href={`/${tenant.handle}`}>
                看我的空间 →
              </Link>
            </div>
          </div>
        </div>
        <div className="row">
          <Link className="btn small" href="/submit">
            + 提交新作品
          </Link>
          <button className="btn ghost small" onClick={logout}>
            退出
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.3fr) minmax(0,0.78fr)', gap: 40, marginTop: 44, alignItems: 'start' }}>
        <div>
          <div className="between" style={{ marginBottom: 14 }}>
            <h2 className="h2" style={{ fontSize: 22 }}>
              我的作品
            </h2>
          </div>

          {projects.length === 0 ? (
            <div className="empty">
              还没有作品。<Link href="/submit" style={{ color: 'var(--accent)' }}>贴个仓库试试</Link>。
            </div>
          ) : (
            <div className="stack-8">
              {projects.map((p) => (
                <div
                  key={p.id}
                  style={{
                    border: '1px solid var(--line)',
                    borderRadius: 12,
                    background: 'var(--card)',
                    overflow: 'hidden',
                  }}
                >
                  <div className="between" style={{ padding: '13px 16px', gap: 12 }}>
                    <div className="row" style={{ gap: 11 }}>
                      <span style={{ color: p.accent, fontSize: 15 }}>{p.glyph}</span>
                      <div>
                        <div style={{ fontSize: 14.5 }}>
                          {p.name}
                          {p.status === 'draft' ? (
                            <span className="pill" style={{ marginLeft: 8 }}>
                              草稿
                            </span>
                          ) : null}
                        </div>
                        <div className="mono muted" style={{ fontSize: 10.5, marginTop: 2 }}>
                          {p.category} · {timeAgo(p.updatedAt)}
                          {p.signals?.audit?.score != null ? ` · 核对 ${p.signals.audit.score}` : ''}
                          {p.changelog?.length ? ` · ${p.changelog.length} 条动态` : ''}
                        </div>
                      </div>
                    </div>
                    <div className="row" style={{ gap: 6 }}>
                      <button
                        className="filter-chip"
                        style={{ height: 26, fontSize: 11.5 }}
                        onClick={() => setEditing(editing === p.id ? null : p.id)}
                      >
                        {editing === p.id ? '收起' : '编辑'}
                      </button>
                      {p.repoUrl ? (
                        <button
                          className="filter-chip"
                          style={{ height: 26, fontSize: 11.5 }}
                          disabled={busy === p.id}
                          onClick={() => rescan(p.id, p.name)}
                        >
                          {busy === p.id ? '扫描中…' : '重扫'}
                        </button>
                      ) : null}
                      <button
                        className="filter-chip"
                        style={{ height: 26, fontSize: 11.5 }}
                        disabled={busy === p.id}
                        onClick={() =>
                          patch(p.id, { status: p.status === 'published' ? 'draft' : 'published' })
                        }
                      >
                        {p.status === 'published' ? '下架' : '上架'}
                      </button>
                      <button
                        className="filter-chip"
                        style={{ height: 26, fontSize: 11.5, color: 'var(--accent)', borderColor: 'var(--accent-soft)' }}
                        disabled={busy === p.id}
                        onClick={() => remove(p.id, p.name)}
                      >
                        删除
                      </button>
                    </div>
                  </div>

                  {editing === p.id ? <Editor project={p} onSave={(body) => patch(p.id, body)} busy={busy === p.id} /> : null}
                  {scanMsg?.id === p.id ? (
                    <div
                      className="mono"
                      style={{ padding: '0 16px 12px', fontSize: 10.5, color: 'var(--jade)', letterSpacing: '0.04em' }}
                    >
                      {scanMsg.text}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}

          {projects.length ? (
            <div style={{ border: '1px solid var(--line)', borderRadius: 12, background: 'var(--card)', padding: 20, marginTop: 22 }}>
              <div className="eyebrow" style={{ marginBottom: 14 }}>
                分类分布
              </div>
              {Array.from(
                projects.reduce((m, p) => m.set(p.category, (m.get(p.category) ?? 0) + 1), new Map<string, number>()),
              )
                .sort((a, b) => b[1] - a[1])
                .map(([cat, n]) => (
                  <div key={cat} style={{ marginBottom: 10 }}>
                    <div className="between" style={{ fontSize: 12, marginBottom: 5 }}>
                      <span>{cat}</span>
                      <span className="muted mono" style={{ fontSize: 10.5 }}>
                        {n}
                      </span>
                    </div>
                    <div className="bar">
                      <i style={{ width: `${(n / projects.length) * 100}%` }} />
                    </div>
                  </div>
                ))}
            </div>
          ) : null}
        </div>

        <aside>
          <div className="side-panel" style={{ position: 'static' }}>
            <div className="between" style={{ marginBottom: 14 }}>
              <div className="eyebrow">空间信息</div>
              {spaceMsg ? <span className="mono" style={{ color: 'var(--jade)', fontSize: 10.5 }}>{spaceMsg}</span> : null}
            </div>
            <label className="field">
              <span>显示名</span>
              <input className="input" value={space.name} onChange={(e) => setSpace({ ...space, name: e.target.value })} />
            </label>
            <label className="field">
              <span>一句话介绍</span>
              <input className="input" value={space.title} onChange={(e) => setSpace({ ...space, title: e.target.value })} />
            </label>
            <label className="field">
              <span>自我介绍</span>
              <textarea
                className="textarea"
                rows={3}
                value={space.bio}
                onChange={(e) => setSpace({ ...space, bio: e.target.value })}
              />
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <label className="field">
                <span>图标</span>
                <input className="input" value={space.glyph} onChange={(e) => setSpace({ ...space, glyph: e.target.value })} />
              </label>
              <div className="field">
                <span>主色</span>
                <div className="row" style={{ gap: 5 }}>
                  {ACCENTS.map((a) => (
                    <button
                      key={a}
                      type="button"
                      onClick={() => setSpace({ ...space, accent: a })}
                      aria-label={a}
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: 6,
                        background: a,
                        border: space.accent.toLowerCase() === a.toLowerCase() ? '2px solid var(--ink)' : '1px solid var(--line)',
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
            <label className="field">
              <span>GitHub</span>
              <input className="input" value={space.github} onChange={(e) => setSpace({ ...space, github: e.target.value })} />
            </label>
            <label className="field">
              <span>个人主页</span>
              <input className="input" value={space.website} onChange={(e) => setSpace({ ...space, website: e.target.value })} />
            </label>
            <button className="btn small" onClick={saveSpace} disabled={busy === 'space'} style={{ width: '100%', justifyContent: 'center' }}>
              {busy === 'space' ? '保存中…' : '保存空间信息'}
            </button>
            <div className="help" style={{ marginTop: 10 }}>
              空间地址 <span className="mono">/{tenant.handle}</span> 创建后不可更改。
            </div>
          </div>

          <div className="side-panel" style={{ position: 'static', marginTop: 20 }}>
            <div className="eyebrow" style={{ marginBottom: 14 }}>
              分发
            </div>
            <a
              className="btn small"
              href={`/api/export/${tenant.handle}`}
              style={{ width: '100%', justifyContent: 'center' }}
            >
              下载 README.md
            </a>
            <div className="help" style={{ marginTop: 10 }}>
              把作品集导出成 Markdown，可直接贴进 GitHub 主页。
            </div>

            <div style={{ marginTop: 16 }}>
              <div className="mono muted" style={{ fontSize: 10.5, marginBottom: 6 }}>
                动态徽章（贴进 README，随重扫自动更新）
              </div>
              <code
                className="mono"
                style={{
                  display: 'block',
                  fontSize: 10.5,
                  background: 'var(--paper)',
                  border: '1px solid var(--line-soft)',
                  borderRadius: 8,
                  padding: '8px 10px',
                  wordBreak: 'break-all',
                  lineHeight: 1.6,
                }}
              >
                {`![kaiwu](${origin}/api/badge/${tenant.handle})`}
              </code>
              <div className="help" style={{ marginTop: 8 }}>
                单件作品用 <span className="mono">/api/badge/{tenant.handle}/&lt;slug&gt;</span>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}

function Editor({ project, onSave, busy }: { project: Project; onSave: (b: Record<string, unknown>) => void; busy: boolean }) {
  const [f, setF] = useState({
    name: project.name,
    tagline: project.tagline,
    summary: project.summary,
    highlights: project.highlights.join('\n'),
    tags: project.tags.join('、'),
    stack: project.stack.join('、'),
    category: project.category,
    demoUrl: project.demoUrl ?? '',
    cover: project.cover ?? '',
    glyph: project.glyph,
    accent: project.accent,
  })

  return (
    <div style={{ borderTop: '1px solid var(--line-soft)', padding: '16px', background: 'var(--paper)' }}>
      <label className="field">
        <span>作品名</span>
        <input className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
      </label>
      <label className="field">
        <span>一句话</span>
        <input className="input" value={f.tagline} onChange={(e) => setF({ ...f, tagline: e.target.value })} />
      </label>
      <label className="field">
        <span>简介</span>
        <textarea className="textarea" rows={3} value={f.summary} onChange={(e) => setF({ ...f, summary: e.target.value })} />
      </label>
      <label className="field">
        <span>能做的事（每行一条）</span>
        <textarea
          className="textarea"
          rows={4}
          value={f.highlights}
          onChange={(e) => setF({ ...f, highlights: e.target.value })}
        />
      </label>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <label className="field">
          <span>标签</span>
          <input className="input" value={f.tags} onChange={(e) => setF({ ...f, tags: e.target.value })} />
        </label>
        <label className="field">
          <span>技术栈</span>
          <input className="input" value={f.stack} onChange={(e) => setF({ ...f, stack: e.target.value })} />
        </label>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <label className="field">
          <span>分类</span>
          <select className="input" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>演示地址</span>
          <input className="input" value={f.demoUrl} onChange={(e) => setF({ ...f, demoUrl: e.target.value })} />
        </label>
      </div>
      <label className="field">
        <span>封面图地址</span>
        <input className="input" value={f.cover} onChange={(e) => setF({ ...f, cover: e.target.value })} placeholder="留空用自动版画" />
      </label>
      <div className="row" style={{ gap: 6 }}>
        {GLYPHS.map((g) => (
          <button
            key={g}
            className="filter-chip"
            data-active={f.glyph === g}
            style={{ width: 32, padding: 0, justifyContent: 'center' }}
            onClick={() => setF({ ...f, glyph: g })}
          >
            {g}
          </button>
        ))}
        {ACCENTS.map((a) => (
          <button
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
      <button
        className="btn small"
        style={{ marginTop: 14 }}
        disabled={busy}
        onClick={() =>
          onSave({
            ...f,
            highlights: f.highlights.split('\n').map((s) => s.trim()).filter(Boolean),
            tags: f.tags.split(/[、,，]/).map((s) => s.trim()).filter(Boolean),
            stack: f.stack.split(/[、,，]/).map((s) => s.trim()).filter(Boolean),
          })
        }
      >
        {busy ? '保存中…' : '保存修改'}
      </button>
    </div>
  )
}
