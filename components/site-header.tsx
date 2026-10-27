import Link from 'next/link'
import { currentTenant } from '@/lib/session'

export async function SiteHeader() {
  const me = await currentTenant()

  return (
    <header className="site-header">
      <div className="wrap header-inner">
        <Link href="/" className="brand">
          <span className="brand-mark">◆</span>
          <span>开物</span>
          <span className="brand-sub">Kaiwu</span>
        </Link>
        <nav className="nav">
          <Link href="/explore">全部作品</Link>
          <Link href="/submit">提交上架</Link>
          {me ? (
            <Link href="/studio">{me.name} 的空间</Link>
          ) : (
            <Link href="/join">开通空间</Link>
          )}
        </nav>
      </div>
    </header>
  )
}
