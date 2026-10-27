import type { Draft } from '../types'
import type { RepoInfo } from '../github'
import { parseReadme } from './heuristic'

export interface LlmConfig {
  apiKey: string
  baseUrl: string
  model: string
}

export function llmConfig(): LlmConfig | null {
  const apiKey = process.env.LLM_API_KEY || process.env.OPENAI_API_KEY
  if (!apiKey) return null
  return {
    apiKey,
    baseUrl: (process.env.LLM_BASE_URL || 'https://api.openai.com/v1').replace(/\/+$/, ''),
    model: process.env.LLM_MODEL || 'gpt-4o-mini',
  }
}

const SYSTEM = `你是一位中文技术产品编辑，擅长把一个开源仓库压缩成作品集里的一张卡片。
你会收到仓库的元信息、目录结构、依赖清单和 README 全文。
请判断这个项目「到底是什么、给谁用、解决了什么痛点」，输出严格的 JSON，不要输出任何解释。

字段要求：
- name：中文产品名，2-6 个汉字，像产品名而不是翻译（例如 "AI 网关"、"智能体中枢"）。若确实没有合适中文名，就用仓库名。
- nameEn：英文名或仓库名（保留原样，小写连字符）。
- tagline：一句话定位，12-28 个汉字，必须具体（说清做什么、给谁），不要用"强大""一站式"这类空话。
- summary：2-3 句，60-110 个汉字，讲清场景与做法，不要罗列功能。
- highlights：3-5 条，每条 6-14 个汉字，是可核对的能力点（名词短语，不要句子）。
- tags：3-6 个，每个 2-6 个字，用于筛选。
- stack：3-6 个技术名词，保留英文原名（如 Spring Boot、WebFlux）。
- category：必须从 ["AI 基础设施","智能体","检索与数据","开发工具","效率工具","前端与界面"] 中选一个。

只输出 JSON 对象。`

function userPrompt(info: RepoInfo, manifests: Record<string, string>): string {
  const parsed = parseReadme(info.readme)
  const readme = info.readme.slice(0, 12000)
  return [
    `仓库：${info.fullName}`,
    `GitHub 描述：${info.description ?? '（无）'}`,
    `Topics：${info.topics.join(', ') || '（无）'}`,
    `主语言：${info.language ?? '未知'}；语言分布：${JSON.stringify(info.languages)}`,
    `Star：${info.stars}；License：${info.license ?? '未知'}`,
    `首页：${info.homepage ?? '（无）'}`,
    `根目录：${info.rootEntries.join(' ')}`,
    `依赖清单：${Object.keys(manifests).join(', ') || '（未发现）'}`,
    parsed.headings.length ? `README 章节：${parsed.headings.slice(0, 20).join(' / ')}` : '',
    '',
    '--- README ---',
    readme,
  ]
    .filter(Boolean)
    .join('\n')
}

const asStrings = (v: unknown, max: number, maxLen: number): string[] =>
  Array.isArray(v)
    ? v
        .filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
        .map((x) => x.trim().slice(0, maxLen))
        .slice(0, max)
    : []

const CATEGORY_NAMES = ['AI 基础设施', '智能体', '检索与数据', '开发工具', '效率工具', '前端与界面']

export async function llmAnalyze(
  info: RepoInfo,
  manifests: Record<string, string>,
  base: Draft,
  cfg: LlmConfig,
): Promise<Draft> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 45_000)
  try {
    const res = await fetch(`${cfg.baseUrl}/chat/completions`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${cfg.apiKey}`,
      },
      body: JSON.stringify({
        model: cfg.model,
        temperature: 0.3,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SYSTEM },
          { role: 'user', content: userPrompt(info, manifests) },
        ],
      }),
    })
    if (!res.ok) {
      throw new Error(`LLM ${res.status}: ${(await res.text()).slice(0, 200)}`)
    }
    const json = await res.json()
    const content: string = json?.choices?.[0]?.message?.content ?? ''
    const start = content.indexOf('{')
    const end = content.lastIndexOf('}')
    if (start < 0 || end <= start) throw new Error('LLM 未返回 JSON')
    const out = JSON.parse(content.slice(start, end + 1))

    const category = CATEGORY_NAMES.includes(out.category) ? (out.category as string) : base.category
    const GLYPH_BY_CATEGORY: Record<string, string> = {
      'AI 基础设施': '◈',
      智能体: '◎',
      '检索与数据': '◍',
      开发工具: '⌘',
      效率工具: '◇',
      '前端与界面': '▤',
    }
    const glyph = category !== base.category ? GLYPH_BY_CATEGORY[category] ?? base.glyph : base.glyph

    return {
      ...base,
      name: typeof out.name === 'string' && out.name.trim() ? out.name.trim().slice(0, 24) : base.name,
      nameEn: typeof out.nameEn === 'string' && out.nameEn.trim() ? out.nameEn.trim() : base.nameEn,
      tagline: typeof out.tagline === 'string' && out.tagline.trim() ? out.tagline.trim().slice(0, 60) : base.tagline,
      summary: typeof out.summary === 'string' && out.summary.trim() ? out.summary.trim().slice(0, 320) : base.summary,
      highlights: asStrings(out.highlights, 5, 40).length >= 2 ? asStrings(out.highlights, 5, 40) : base.highlights,
      tags: asStrings(out.tags, 6, 12).length >= 2 ? asStrings(out.tags, 6, 12) : base.tags,
      stack: asStrings(out.stack, 6, 24).length >= 2 ? asStrings(out.stack, 6, 24) : base.stack,
      category,
      glyph,
      signals: {
        ...base.signals,
        engine: `llm:${cfg.model}`,
        notes: [...base.signals.notes, `LLM 语义生成（${cfg.model}）`],
      },
    }
  } finally {
    clearTimeout(timer)
  }
}
