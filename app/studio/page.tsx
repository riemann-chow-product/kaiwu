import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { listProjects } from '@/lib/db'
import { currentTenant } from '@/lib/session'
import { StudioClient } from './studio-client'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = { title: '管理台' }

export default async function StudioPage() {
  const me = await currentTenant()
  if (!me) redirect('/join?next=/studio')
  const projects = listProjects({ tenantId: me.id, includeAll: true })
  return <StudioClient tenant={me} projects={projects} />
}
