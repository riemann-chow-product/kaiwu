import type { Project, Tenant } from './types'

/** 把一个空间导出成一份带核对徽章的 Markdown（可直接贴进 GitHub README） */
export function buildReadme(tenant: Tenant, projects: Project[], baseUrl: string): string {
  const b = baseUrl.replace(/\/+$/, '')
  const lines: string[] = []

  lines.push(`# ${tenant.name}`)
  if (tenant.title) lines.push(`\n${tenant.title}`)
  if (tenant.bio) lines.push(`\n${tenant.bio}`)
  lines.push(`\n![kaiwu 核对分](${b}/api/badge/${tenant.handle})`)
  lines.push(`\n## 作品\n`)

  for (const p of projects) {
    const url = `${b}/${tenant.handle}/${p.slug}`
    lines.push(`### [${p.name}](${url})`)
    if (p.tagline) lines.push(`\n> ${p.tagline}`)
    lines.push('')

    const audit = p.signals?.audit
    if (audit?.score != null) {
      lines.push(
        `- 核对：**${audit.score}/100**（${audit.verified.length} 有据 / ${audit.claimedOnly.length} 存疑 / ${audit.evidenceOnly.length} 待补）`,
      )
    }
    if (p.stack?.length) lines.push(`- 技术栈：${p.stack.join(' · ')}`)
    if (p.repoUrl) lines.push(`- 仓库：${p.repoUrl}`)
    if (p.demoUrl) lines.push(`- 演示：${p.demoUrl}`)
    if (p.changeSummary) lines.push(`- 最近：${p.changeSummary}`)
    lines.push(`- 徽章：\`![${p.name}](${b}/api/badge/${tenant.handle}/${p.slug})\``)
    lines.push('')
  }

  lines.push('---')
  lines.push(`由 [开物 Kaiwu](${b}) 生成 · 核对分基于「宣称 vs 代码证据」`)
  return lines.join('\n')
}
