export function timeAgo(ts: number): string {
  const diff = Date.now() - ts
  const d = Math.floor(diff / 86400000)
  if (d <= 0) return '今天'
  if (d === 1) return '昨天'
  if (d < 30) return `${d} 天前`
  if (d < 365) return `${Math.floor(d / 30)} 个月前`
  return `${Math.floor(d / 365)} 年前`
}

export function formatDate(ts: number): string {
  const d = new Date(ts)
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
}

export function compactNumber(n: number | null | undefined): string {
  if (n == null) return '—'
  if (n < 1000) return String(n)
  if (n < 10000) return `${(n / 1000).toFixed(1)}k`
  return `${Math.round(n / 1000)}k`
}

export function initialsOf(name: string): string {
  const trimmed = name.trim()
  if (!trimmed) return '◆'
  return trimmed.slice(0, 1)
}

export const CATEGORY_ORDER = ['AI 基础设施', '智能体', '检索与数据', '开发工具', '效率工具', '前端与界面']
