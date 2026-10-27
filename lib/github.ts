export interface RepoCommit {
  sha: string
  date: string
  message: string
}

export interface RepoInfo {
  owner: string
  repo: string
  fullName: string
  htmlUrl: string
  description: string | null
  homepage: string | null
  topics: string[]
  language: string | null
  languages: Record<string, number>
  stars: number
  forks: number
  license: string | null
  defaultBranch: string
  pushedAt: string | null
  size: number
  archived: boolean
  readme: string
  /** 根目录条目（目录带 / 后缀） */
  rootEntries: string[]
  /** 完整文件路径列表 —— 宣称 vs 证据核对的主要证据源 */
  files: string[]
  truncated: boolean
  /** 最近的提交 —— 「作品动态」最真实的信号 */
  commits: RepoCommit[]
}

const API = 'https://api.github.com'
const RAW = 'https://raw.githubusercontent.com'

function headers(): Record<string, string> {
  const h: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'kaiwu-portfolio',
    'X-GitHub-Api-Version': '2022-11-28',
  }
  const token = process.env.GITHUB_TOKEN
  if (token) h.Authorization = `Bearer ${token}`
  return h
}

export function parseRepoUrl(input: string): { owner: string; repo: string } | null {
  const raw = input.trim()
  if (!raw) return null
  const short = raw.match(/^([\w.-]+)\/([\w.-]+)$/)
  if (short) return { owner: short[1], repo: short[2].replace(/\.git$/, '') }
  try {
    const url = new URL(raw.startsWith('http') ? raw : `https://${raw}`)
    if (!/github\.com$/i.test(url.hostname.replace(/^www\./, ''))) return null
    const parts = url.pathname.split('/').filter(Boolean)
    if (parts.length < 2) return null
    return { owner: parts[0], repo: parts[1].replace(/\.git$/, '') }
  } catch {
    return null
  }
}

async function gh(path: string): Promise<any | null> {
  const res = await fetch(`${API}${path}`, { headers: headers(), cache: 'no-store' })
  if (!res.ok) return null
  return res.json()
}

/** 从 raw.githubusercontent 读文件：不消耗 API 配额 */
async function raw(owner: string, repo: string, branch: string, file: string): Promise<string | null> {
  try {
    const res = await fetch(`${RAW}/${owner}/${repo}/${branch}/${file}`, {
      headers: { 'User-Agent': 'kaiwu-portfolio' },
      cache: 'no-store',
    })
    if (!res.ok) return null
    return await res.text()
  } catch {
    return null
  }
}

const README_CANDIDATES = [
  'README.zh-CN.md',
  'README.md',
  'readme.md',
  'Readme.md',
  'README.zh-cn.md',
  'README_EN.md',
  'README.rst',
]

/**
 * 只花 2 次 API 配额：repo 元信息 + 完整文件树。
 * README 与依赖清单走 raw.githubusercontent，不占配额。
 */
export async function fetchRepo(owner: string, repo: string): Promise<RepoInfo> {
  const meta = await gh(`/repos/${owner}/${repo}`)
  if (!meta) {
    throw new Error(
      `读不到 ${owner}/${repo}：可能是仓库不存在、私有，或 GitHub 限流（未配置 GITHUB_TOKEN 时每小时 60 次）。`,
    )
  }

  const branch = meta.default_branch || 'main'

  const [tree, languages] = await Promise.all([
    gh(`/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`),
    gh(`/repos/${owner}/${repo}/languages`),
  ])

  const files: string[] = Array.isArray(tree?.tree)
    ? tree.tree.filter((t: any) => t.type === 'blob').map((t: any) => t.path)
    : []
  const dirs: string[] = Array.isArray(tree?.tree)
    ? tree.tree.filter((t: any) => t.type === 'tree').map((t: any) => t.path)
    : []

  const rootEntries = Array.from(new Set(files.concat(dirs).map((p) => p.split('/')[0])))
    .map((n) => (dirs.includes(n) ? `${n}/` : n))
    .sort()

  const readmeFile =
    README_CANDIDATES.find((c) => files.includes(c)) ??
    files.find((f) => /^readme[^/]*$/i.test(f)) ??
    null
  const readmeText = readmeFile ? (await raw(owner, repo, branch, readmeFile)) ?? '' : ''

  // 最近提交 —— 一次 API 调用，换来「作品动态」最真实的信号
  const commitList = await gh(`/repos/${owner}/${repo}/commits?per_page=20`)
  const commits: RepoCommit[] = Array.isArray(commitList)
    ? commitList.map((c: any) => ({
        sha: c.sha ?? '',
        date: c.commit?.author?.date ?? '',
        message: String(c.commit?.message ?? '').split('\n')[0].slice(0, 120),
      }))
    : []

  return {
    owner,
    repo,
    fullName: meta.full_name,
    htmlUrl: meta.html_url,
    description: meta.description ?? null,
    homepage: meta.homepage || null,
    topics: Array.isArray(meta.topics) ? meta.topics : [],
    language: meta.language ?? null,
    languages: languages && typeof languages === 'object' ? languages : {},
    stars: meta.stargazers_count ?? 0,
    forks: meta.forks_count ?? 0,
    license: meta.license?.spdx_id && meta.license.spdx_id !== 'NOASSERTION' ? meta.license.spdx_id : null,
    defaultBranch: branch,
    pushedAt: meta.pushed_at ?? null,
    size: meta.size ?? 0,
    archived: !!meta.archived,
    readme: readmeText,
    rootEntries,
    files,
    truncated: !!tree?.truncated,
    commits,
  }
}

/** 读依赖清单内容（走 raw，不占 API 配额） */
export async function fetchManifest(
  owner: string,
  repo: string,
  filename: string,
  branch = 'main',
): Promise<string | null> {
  return raw(owner, repo, branch, filename)
}
