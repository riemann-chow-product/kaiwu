import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { buildAgentCard } from '@/lib/agent-card'
import { getTenantByHandle, listProjects } from '@/lib/db'
import { signPayload, keyId } from '@/lib/sign'
import { CopyButton } from '@/components/copy-button'

export const dynamic = 'force-dynamic'

type Params = { tenant: string }

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { tenant } = await params
  const t = getTenantByHandle(decodeURIComponent(tenant))
  return { title: t ? `${t.name} 的 Agent Card` : 'Agent Card' }
}

export default async function AgentCardPage({ params }: { params: Promise<Params> }) {
  const { tenant } = await params
  const t = getTenantByHandle(decodeURIComponent(tenant))
  if (!t) notFound()

  const projects = listProjects({ tenantId: t.id })
  const h = await headers()
  const host = h.get('host') ?? 'localhost:4310'
  const proto = h.get('x-forwarded-proto') ?? 'http'
  const base = process.env.KAIWU_PUBLIC_URL || `${proto}://${host}`

  const card = buildAgentCard(t, projects, base)
  const signature = signPayload(card)
  const signedCard = { ...card, signature }
  const json = JSON.stringify(signedCard, null, 2)
  const endpoint = `${base}/api/agent-card/${t.handle}`

  return (
    <div className="wrap" style={{ padding: '54px 32px 90px' }}>
      <div className="eyebrow">
        <Link href={`/${t.handle}`} style={{ color: 'var(--muted)' }}>
          {t.name} 的空间
        </Link>
        <span style={{ margin: '0 8px' }}>/</span>
        Agent Card
      </div>

      <h1 className="detail-title" style={{ marginTop: 12 }}>
        一张给机器看的
        <span style={{ color: 'var(--accent)' }}>名片</span>
      </h1>

      <p className="detail-tagline" style={{ maxWidth: '54ch' }}>
        同一份结构化数据，换一种输出：这个空间的全部作品、能力点、技术栈和证据强度，
        被压成一个符合 A2A AgentCard 习惯的 JSON。别的智能体可以像发现一个 agent 那样发现一个人。
      </p>

      <div className="row" style={{ marginTop: 18, gap: 10, alignItems: 'center' }}>
        <span
          className="pill solid"
          style={{ background: 'var(--jade)', color: '#fff', border: 'none', fontSize: 11 }}
        >
          已签名 · 可验证
        </span>
        <span className="mono muted" style={{ fontSize: 11 }}>
          EdDSA · kid {keyId()}
        </span>
        <a
          className="mono"
          href="/.well-known/kaiwu.json"
          target="_blank"
          rel="noreferrer"
          style={{ fontSize: 11, textDecoration: 'underline', color: 'var(--muted)' }}
        >
          公钥 ↗
        </a>
      </div>

      <div className="row" style={{ marginTop: 26, gap: 10 }}>
        <CopyButton text={endpoint} label="复制接口地址" />
        <CopyButton text={json} label="复制完整 JSON" />
        <a className="btn ghost small" href={`/api/agent-card/${t.handle}`} target="_blank" rel="noreferrer">
          直接打开 JSON ↗
        </a>
      </div>

      <div className="steps" style={{ marginTop: 44 }}>
        <div className="step">
          <div className="step-num">ENDPOINT</div>
          <h3>HTTP</h3>
          <p className="mono" style={{ fontSize: 11.5, wordBreak: 'break-all' }}>
            GET /api/agent-card/{t.handle}
          </p>
        </div>
        <div className="step">
          <div className="step-num">SEARCH</div>
          <h3>按能力搜人</h3>
          <p className="mono" style={{ fontSize: 11.5, wordBreak: 'break-all' }}>
            GET /api/search?q=混合检索&amp;handle={t.handle}
          </p>
        </div>
        <div className="step">
          <div className="step-num">MCP</div>
          <h3>挂进智能体</h3>
          <p className="mono" style={{ fontSize: 11.5 }}>
            node packages/mcp/server.mjs
          </p>
        </div>
      </div>

      <div className="detail-grid" style={{ paddingTop: 44 }}>
        <div>
          <div className="eyebrow" style={{ marginBottom: 14 }}>
            技能清单（{card.skills.length}）
          </div>
          <div className="stack-8">
            {card.skills.map((s) => (
              <div
                key={s.id}
                style={{
                  border: '1px solid var(--line)',
                  borderRadius: 12,
                  background: 'var(--card)',
                  padding: '14px 16px',
                }}
              >
                <div className="between">
                  <div className="row" style={{ gap: 10 }}>
                    <span style={{ fontSize: 13.5 }}>{s.name}</span>
                    <code className="mono muted" style={{ fontSize: 10.5 }}>
                      {s.id}
                    </code>
                  </div>
                  <span className="mono muted" style={{ fontSize: 10.5 }}>
                    {s.evidence.score == null ? '未核对' : `核对 ${s.evidence.score}`}
                  </span>
                </div>
                <p style={{ margin: '6px 0 0', fontSize: 12.5, color: 'var(--ink-soft)', lineHeight: 1.65 }}>
                  {s.description}
                </p>
                <div className="row" style={{ gap: 5, marginTop: 9 }}>
                  <span className="pill solid">{s.category}</span>
                  {s.stack.slice(0, 4).map((x) => (
                    <span className="pill" key={x}>
                      {x}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <aside>
          <div className="side-panel">
            <div className="eyebrow" style={{ marginBottom: 12 }}>
              原始 JSON
            </div>
            <pre
              className="mono"
              style={{
                margin: 0,
                fontSize: 10.5,
                lineHeight: 1.6,
                maxHeight: 460,
                overflow: 'auto',
                background: 'var(--paper)',
                border: '1px solid var(--line-soft)',
                borderRadius: 8,
                padding: 12,
                color: 'var(--ink-soft)',
              }}
            >
              {json}
            </pre>
            <div className="help" style={{ marginTop: 12 }}>
              生成于 {new Date(card.generatedAt).toLocaleString('zh-CN')}，
              含 {card.capabilities.verifiedClaims} 条有据能力点。
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
