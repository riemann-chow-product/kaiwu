import { fetchManifest, fetchRepo, parseRepoUrl } from '../github'
import type { Draft } from '../types'
import { heuristicAnalyze } from './heuristic'
import { llmAnalyze, llmConfig } from './llm'

export interface AnalyzeResult {
  draft: Draft
  warnings: string[]
}

/**
 * 依赖清单文件名 → 生态。
 *
 * 顺序即优先级：Java 与 Node 生态的清单更能代表项目主体，排前面。
 */
const MANIFEST_CANDIDATES = [
  'pom.xml',
  'package.json',
  'go.mod',
  'Cargo.toml',
  'requirements.txt',
  'pyproject.toml',
  'composer.json',
  'Gemfile',
]

/**
 * 在整个文件树里找依赖清单，而不只是根目录。
 *
 * 真实项目经常把前端放在子目录（frontend/package.json）、
 * 把构建脚本放在 scripts/（scripts/Dockerfile）。
 * 只看根目录会漏掉一整个生态 —— 比如 Go 后端 + React 前端的项目，
 * 只读根目录就永远识别不到 React。
 *
 * 优先级：根目录 > 浅层子目录 > 深层。
 */
function findManifestFiles(files: string[]): string[] {
  const found = new Map<string, string>()

  for (const f of files) {
    const base = f.split('/').pop() ?? ''
    if (!MANIFEST_CANDIDATES.includes(base)) continue
    // 同一个文件名只保留路径最短的那份（frontend/package.json 优于 frontend/packages/core/package.json）
    const prev = found.get(base)
    if (!prev || f.length < prev.length) found.set(base, f)
  }

  return Array.from(found.values())
}

/** 部署相关文件只看根目录与浅层子目录，它们描述的是「项目怎么跑起来」 */
function findDeployFiles(files: string[]): string[] {
  return files.filter(
    (f) =>
      /(^|\/)(docker-compose[^/]*\.ya?ml|Dockerfile|Makefile)$/i.test(f) &&
      f.split('/').length <= 2,
  )
}

export interface AnalyzeOptions {
  /** 重扫时关掉大模型：只更新信号，不动文案 */
  skipLlm?: boolean
}

export async function analyzeRepoUrl(input: string, opts: AnalyzeOptions = {}): Promise<AnalyzeResult> {
  const parsed = parseRepoUrl(input)
  if (!parsed) throw new Error('这不是一个有效的 GitHub 仓库地址，格式应为 https://github.com/owner/repo')

  const info = await fetchRepo(parsed.owner, parsed.repo)
  const warnings: string[] = []

  // 依赖清单走 raw.githubusercontent，不消耗 API 配额。
  // 在整个文件树里找（不只根目录），最多读 5 份 —— 覆盖多语言/前后端分离的仓库。
  const manifests: Record<string, string> = {}
  const manifestFiles = findManifestFiles(info.files).slice(0, 5)
  await Promise.all(
    manifestFiles.map(async (path) => {
      const content = await fetchManifest(parsed.owner, parsed.repo, path, info.defaultBranch)
      if (content) manifests[path] = content.slice(0, 20000)
    }),
  )

  // 部署相关文件（Dockerfile / compose / Makefile）不需要内容，只要知道存在
  const deployFiles = findDeployFiles(info.files)

  let draft = heuristicAnalyze(info, manifests, deployFiles)

  const cfg = opts.skipLlm ? null : llmConfig()
  if (cfg) {
    try {
      draft = await llmAnalyze(info, manifests, draft, cfg)
    } catch (e) {
      warnings.push(`大模型润色失败，已回退到本地语义解析：${e instanceof Error ? e.message : String(e)}`)
    }
  } else if (!opts.skipLlm) {
    warnings.push(
      '未配置 LLM_API_KEY，本次使用本地语义解析引擎（读 README + 文件树 + 依赖清单做规则推断）。配置密钥后同一链接可获得更自然的中文文案。',
    )
  }

  if (!info.readme) warnings.push('该仓库没有 README，卡片文案主要依据目录结构与依赖推断，建议手动补充。')
  if (info.archived) warnings.push('该仓库已被作者归档。')
  if (info.truncated) warnings.push('仓库文件数过多，证据扫描只覆盖了前一部分文件，核对结果可能偏保守。')

  return { draft, warnings }
}
