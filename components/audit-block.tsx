import type { Audit, AuditItem } from '@/lib/types'

const TONE_MARK = { ok: '✓', warn: '⚠', plus: '+', muted: '?' } as const

function Row({
  tone,
  title,
  items,
  showProof,
  empty,
}: {
  tone: keyof typeof TONE_MARK
  title: string
  items: AuditItem[]
  showProof?: boolean
  empty?: string
}) {
  return (
    <div className={`tone-${tone}`}>
      <div className="audit-row-title">
        <b>{title}</b>
        <span className="n">{items.length}</span>
      </div>
      {items.length === 0 ? (
        <div className="audit-empty">{empty ?? '—'}</div>
      ) : (
        items.map((item) => (
          <div className="audit-item" key={item.tag}>
            <span className="audit-mark">{TONE_MARK[tone]}</span>
            <span>{item.label}</span>
            {showProof && item.proof ? (
              item.proofUrl ? (
                <a
                  className="proof"
                  href={item.proofUrl}
                  target="_blank"
                  rel="noreferrer"
                  title="打开对应的代码位置"
                  style={{ textDecoration: 'underline', textUnderlineOffset: 2 }}
                >
                  {item.proof} ↗
                </a>
              ) : (
                <code className="proof">{item.proof}</code>
              )
            ) : null}
          </div>
        ))
      )}
    </div>
  )
}

export function AuditBlock({
  audit,
  collapsible = false,
  defaultOpen = false,
}: {
  audit: Audit
  collapsible?: boolean
  defaultOpen?: boolean
}) {
  const score = audit.score

  const head = (
    <div className="audit-head">
      <span className="title">核对 · 宣称 vs 证据</span>
      <span className="row" style={{ gap: 14 }}>
        <span className="mono muted" style={{ fontSize: 10.5 }}>
          {audit.verified.length} 有据 / {audit.claimedOnly.length} 存疑 / {audit.evidenceOnly.length} 待补
        </span>
        <span className="audit-score" style={{ color: score == null ? 'var(--muted)' : undefined }}>
          {score == null ? '—' : score}
          {score == null ? null : <i>/100</i>}
        </span>
      </span>
    </div>
  )

  const body = (
    <>
      <p className="audit-summary">{audit.summary}</p>
      <div className="audit-rows">
        <Row
          tone="ok"
          title="有据可查"
          items={audit.verified}
          showProof
          empty="没有找到「说法 + 证据」同时成立的能力点。"
        />
        <Row
          tone="warn"
          title="只有说法"
          items={audit.claimedOnly}
          empty="没有发现夸大的地方。"
        />
        <Row
          tone="plus"
          title="做到了但没写"
          items={audit.evidenceOnly}
          showProof
          empty="文案已经把该说的都说了。"
        />
        {audit.unverifiable.length ? (
          <Row
            tone="muted"
            title="需人工核对"
            items={audit.unverifiable}
            empty="—"
          />
        ) : null}
      </div>
    </>
  )

  if (!collapsible) {
    return (
      <div className="audit">
        {head}
        {body}
      </div>
    )
  }

  return (
    <details className="audit" open={defaultOpen}>
      <summary className="audit-head" style={{ borderBottom: 'none' }}>
        <span className="title">核对 · 宣称 vs 证据</span>
        <span className="row" style={{ gap: 14 }}>
          <span className="mono muted" style={{ fontSize: 10.5 }}>
            {audit.verified.length} 有据 / {audit.claimedOnly.length} 存疑 / {audit.evidenceOnly.length} 待补
          </span>
          <span className="audit-score" style={{ color: score == null ? 'var(--muted)' : undefined }}>
            {score == null ? '—' : score}
            {score == null ? null : <i>/100</i>}
          </span>
        </span>
      </summary>
      {body}
    </details>
  )
}
