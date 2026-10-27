import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { currentTenant } from '@/lib/session'
import { JoinClient } from './join-client'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = { title: '开通空间' }

export default async function JoinPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const me = await currentTenant()
  const { next } = await searchParams
  if (me) redirect(next || '/studio')
  return <JoinClient next={next || '/studio'} />
}
