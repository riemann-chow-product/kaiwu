import type { Metadata } from 'next'
import { currentTenant } from '@/lib/session'
import { SubmitClient } from './submit-client'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: '提交上架',
  description: '贴一个 GitHub 仓库地址，AI 读完代码自动写好作品卡片。',
}

export default async function SubmitPage() {
  const me = await currentTenant()
  return <SubmitClient me={me ? { handle: me.handle, name: me.name } : null} />
}
