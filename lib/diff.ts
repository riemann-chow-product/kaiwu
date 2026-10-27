import type { AnalysisSignals, ChangeEntry, Project } from './types'

export interface ScanSnapshot {
  signals: AnalysisSignals
}

/**
 * 对比两次扫描，产出「作品动态」。
 *
 * 刻意只比结构化信号（能力点、技术栈、star、许可、提交），不比生成的中文文案 ——
 * 文案每次生成都会漂移，拿它做 diff 只会得到一堆噪音。
 * 也不比卡片上的 stack：那是作者定稿过的内容，重扫只做提醒，不改写。
 *
 * 三类信号的价值排序：
 *  1. commit —— 仓库真的动了什么，最真实
 *  2. capability —— 宣称的能力点变了，反映定位调整
 *  3. stack / stars / license —— 辅助信息
 */
export function diffScan(prev: Project, next: ScanSnapshot): ChangeEntry[] {
  const at = Date.now()
  const out: ChangeEntry[] = []
  const push = (type: ChangeEntry['type'], text: string, sha?: string) =>
    out.push(sha ? { at, type, text, sha } : { at, type, text })

  // ① 新增提交 —— 最真实的「项目在动」信号
  const prevShas = new Set((prev.signals?.recentCommits ?? []).map((c) => c.sha))
  const newCommits = (next.signals.recentCommits ?? []).filter((c) => c.sha && !prevShas.has(c.sha))
  for (const c of newCommits.slice(0, 8)) {
    push('commit', `新提交：${c.message}`, c.sha)
  }

  // ② 能力点：宣称了什么变了
  const prevHits = new Map((prev.signals?.keywordHits ?? []).map((k) => [k.label, k.weight]))
  const nextHits = new Map(next.signals.keywordHits.map((k) => [k.label, k.weight]))

  for (const [label, weight] of nextHits) {
    if (!prevHits.has(label)) push('capability_added', `新识别到能力点「${label}」（权重 ${weight}）`)
  }
  for (const [label] of prevHits) {
    if (!nextHits.has(label)) push('capability_removed', `「${label}」这次没有在 README 里找到`)
  }

  // 从「只有说法」变成「有代码佐证」
  const prevVerified = new Set((prev.signals?.audit?.verified ?? []).map((v) => v.tag))
  for (const v of next.signals.audit?.verified ?? []) {
    if (!prevVerified.has(v.tag) && prevHits.has(v.label)) {
      push('capability_verified', `「${v.label}」补上了代码佐证：${v.proof ?? '—'}`)
    }
  }

  // ③ 技术栈：只报新增。
  // 移除几乎总是噪音 —— 检测器的排序变化就会让某个词掉出前 6 名，
  // 把它当「项目删掉了这个技术栈」会误导人。移除不报，新增才报。
  const prevStack = new Set(prev.signals?.detectedStack ?? [])
  for (const s of next.signals.detectedStack ?? []) {
    if (!prevStack.has(s)) push('stack_added', `识别到技术栈 ${s}`)
  }

  // ④ 星数与许可
  const prevStars = prev.stars
  const nextStars = next.signals.stars
  if (prevStars != null && nextStars != null && nextStars !== prevStars) {
    const delta = nextStars - prevStars
    push('stars', `Star ${delta > 0 ? '+' : ''}${delta} → ${nextStars}`)
  }

  const nextLicense = next.signals.license
  if (prev.license && nextLicense && prev.license !== nextLicense) {
    push('license', `许可从 ${prev.license} 改为 ${nextLicense}`)
  }

  return out
}
