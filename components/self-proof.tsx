'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function SelfProofCard({
  projectId,
  tag,
  label,
  question,
  initialAnswer,
  canEdit,
}: {
  projectId: string
  tag: string
  label: string
  question: string
  initialAnswer: string
  canEdit: boolean
}) {
  const [answer, setAnswer] = useState(initialAnswer)
  const [saved, setSaved] = useState(initialAnswer)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const router = useRouter()

  async function submit() {
    const text = answer.trim()
    if (!text) return
    setBusy(true)
    setErr('')
    try {
      const res = await fetch(`/api/projects/${projectId}/self-proof`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tag, answer: text }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error || '保存失败')
      }
      setSaved(text)
      router.refresh()
    } catch (e) {
      setErr(e instanceof Error ? e.message : '保存失败')
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
        padding: '14px 16px',
      }}
    >
      <div className="row" style={{ gap: 8, alignItems: 'center', marginBottom: 8 }}>
        <span className="pill solid" style={{ fontSize: 10.5 }}>
          {label}
        </span>
        {saved ? (
          <span className="mono" style={{ fontSize: 10.5, color: 'var(--jade)' }}>
            作者已补充说明
          </span>
        ) : (
          <span className="mono muted" style={{ fontSize: 10.5 }}>
            待补充
          </span>
        )}
      </div>

      <p style={{ margin: '0 0 10px', fontSize: 12.5, color: 'var(--ink-soft)', lineHeight: 1.65 }}>
        {question}
      </p>

      {canEdit ? (
        <>
          <textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="写出文件路径 / 依赖名 / 一句话说明…"
            rows={2}
            style={{
              width: '100%',
              boxSizing: 'border-box',
              fontSize: 12.5,
              padding: '8px 10px',
              borderRadius: 8,
              border: '1px solid var(--line)',
              background: 'var(--paper)',
              color: 'var(--ink)',
              resize: 'vertical',
            }}
          />
          <div className="row" style={{ gap: 10, marginTop: 8, alignItems: 'center' }}>
            <button className="btn small" onClick={submit} disabled={busy || !answer.trim()}>
              {busy ? '保存中…' : '保存自证'}
            </button>
            {err ? <span style={{ fontSize: 11, color: 'var(--accent)' }}>{err}</span> : null}
          </div>
        </>
      ) : saved ? (
        <p style={{ margin: 0, fontSize: 13, lineHeight: 1.7, borderLeft: '2px solid var(--jade)', paddingLeft: 10 }}>
          {saved}
        </p>
      ) : (
        <p className="mono muted" style={{ margin: 0, fontSize: 11 }}>
          作者尚未补充说明
        </p>
      )}
    </div>
  )
}
