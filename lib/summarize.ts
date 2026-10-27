import { llmConfig } from './analyze/llm'

/**
 * 把一组提交归纳成一句「人话」进展摘要。
 *
 * 先用启发式按 conventional-commit 前缀分组（feat/fix/docs/refactor…），
 * 配了 LLM 再让模型改写得更自然；任何失败都退回启发式结果，绝不空着。
 */

const GROUPS: { re: RegExp; label: string }[] = [
  { re: /^feat|^feature/i, label: '新功能' },
  { re: /^fix|^bugfix/i, label: '修复' },
  { re: /^refactor/i, label: '重构' },
  { re: /^perf/i, label: '性能' },
  { re: /^test/i, label: '测试' },
  { re: /^docs?/i, label: '文档' },
  { re: /^chore|^build|^ci|^style/i, label: '杂项' },
]

const ORDER = ['新功能', '修复', '重构', '性能', '测试', '文档', '杂项', '其他改动']

const uniq = (a: string[]) => Array.from(new Set(a))
const stripPrefix = (m: string) => m.replace(/^[a-z]+(\([^)]*\))?:\s*/i, '').trim()

export function summarizeCommits(commits: { message: string }[] = []): string {
  const list = commits
    .map((c) => (c.message || '').trim())
    .filter(Boolean)
    .filter((m) => !/init\s+commit$/i.test(m) && !/^init$/i.test(m))
  if (!list.length) return ''

  const feats = uniq(list.filter((m) => /^feat/i.test(m)).map(stripPrefix)).filter(Boolean).slice(0, 2)

  const counts: Record<string, number> = {}
  for (const m of list) {
    const g = GROUPS.find((x) => x.re.test(m))
    const label = g?.label ?? '其他改动'
    counts[label] = (counts[label] ?? 0) + 1
  }

  const rest = ORDER.filter((k) => k !== '新功能' && counts[k]).map((k) => `${counts[k]} 处${k}`)
  const featPart = feats.length ? `新增 ${feats.join('、')}` : ''
  const restPart = rest.join('、')

  if (featPart && restPart) return `本次更新：${featPart}；另有 ${restPart}。`
  if (featPart) return `本次更新：${featPart}。`
  return `本次更新：${restPart || '若干改动'}。`
}

export async function summarizeChange(
  commits: { message: string }[],
  opts: { useLlm?: boolean } = {},
): Promise<string> {
  const fallback = summarizeCommits(commits)
  const messages = commits.map((c) => c.message).filter(Boolean)
  const cfg = opts.useLlm === false ? null : llmConfig()
  if (!cfg || messages.length === 0) return fallback

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 12_000)
  try {
    const res = await fetch(`${cfg.baseUrl}/chat/completions`, {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cfg.apiKey}` },
      body: JSON.stringify({
        model: cfg.model,
        temperature: 0.3,
        messages: [
          {
            role: 'system',
            content:
              '你把一组 git 提交信息归纳成一句中文进展摘要，不超过 40 字，直接输出这句话，不要引号、不要解释、不要列表。',
          },
          { role: 'user', content: messages.join('\n') },
        ],
      }),
    })
    if (!res.ok) return fallback
    const json = await res.json()
    const text: string = (json?.choices?.[0]?.message?.content ?? '').trim()
    if (!text || text.length > 80) return fallback
    return text
  } catch {
    return fallback
  } finally {
    clearTimeout(timer)
  }
}
