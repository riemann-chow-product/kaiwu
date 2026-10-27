'use client'

import { useState } from 'react'
import type { JdMatchResult } from '@/lib/capability'

export function JdMatch({ handle }: { handle: string }) {
  const [jd, setJd] = useState('')
  const [res, setRes] = useState<JdMatchResult | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  async function run() {
    if (!jd.trim()) return
    setBusy(true)
    setErr('')
    try {
      const r = await fetch('/api/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ handle, jd }),
      })
      if (!r.ok) throw new Error('匹配失败')
      setRes(await r.json())
    } catch (e) {
      setErr(e instanceof Error ? e.message : '匹配失败')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      style={{
        border: '1px solid var(--line)',
        borderRadius: 12,
        background: 'var(--card)',
        padding: '16px 18px',
      }}
    >
      <div className="eyebrow" style={{ marginBottom: 10 }}>
        贴一段 JD，看能对上多少
      </div>
      <textarea
        value={jd}
        onChange={(e) => setJd(e.target.value)}
        placeholder="粘贴岗位描述，例如：熟悉 RAG / 向量检索，做过 Agent 编排与多模型接入…"
        rows={4}
        style={{
          width: '100%',
          boxSizing: 'border-box',
          fontSize: 12.5,
          lineHeight: 1.6,
          padding: '10px 12px',
          borderRadius: 8,
          border: '1px solid var(--line)',
          background: 'var(--paper)',
          color: 'var(--ink)',
          resize: 'vertical',
        }}
      />
      <div className="row" style={{ gap: 10, marginTop: 10, alignItems: 'center' }}>
        <button className="btn small" onClick={run} disabled={busy || !jd.trim()}>
          {busy ? '匹配中…' : '匹配能力'}
        </button>
        {err ? <span style={{ fontSize: 11, color: 'var(--accent)' }}>{err}</span> : null}
      </div>

      {res ? (
        res.matchedCount === 0 ? (
          <p className="mono muted" style={{ marginTop: 14, fontSize: 12 }}>
            没匹配到能力点。换些关键词试试（如「检索」「多模型」「MCP」）。
          </p>
        ) : (
          <div style={{ marginTop: 16 }}>
            <p style={{ margin: '0 0 10px', fontSize: 13, color: 'var(--ink-soft)' }}>
              命中 <b>{res.matchedCount}</b> 个能力点，其中 <b>{res.verifiedCount}</b> 个有代码佐证
              <span className="mono muted" style={{ marginLeft: 8, fontSize: 11 }}>
                有据率 {res.evidenceRate}%
              </span>
            </p>
            <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
              {res.matched.map((m) => (
                <span
                  key={m.project + m.label}
                  className="pill"
                  style={
                    m.verified
                      ? { borderColor: 'var(--jade)', color: 'var(--jade)' }
                      : { borderColor: 'var(--accent)', color: 'var(--accent)' }
                  }
                  title={m.verified ? `有代码佐证 · ${m.proof ?? ''}` : '只有说法'}
                >
                  {m.label}
                  {m.verified ? ' ✓' : ' ?'}
                </span>
              ))}
            </div>
          </div>
        )
      ) : null}
    </div>
  )
}
