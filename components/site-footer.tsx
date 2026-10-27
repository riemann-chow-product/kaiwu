import Link from 'next/link'

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="wrap footer-inner">
        <div>
          <div style={{ fontFamily: 'var(--serif)', fontSize: 19 }}>开物 · 开发者作品空间</div>
          <p className="footer-note" style={{ marginTop: 10 }}>
            贴一个仓库地址，AI 读完代码替你写介绍。
            <br />
            多租户，各自独立的空间与作品集。
          </p>
        </div>
        <div className="footer-note" style={{ textAlign: 'right' }}>
          <Link href="/submit">提交作品 →</Link>
          <br />
          <Link href="/join">开通自己的空间 →</Link>
        </div>
      </div>
    </footer>
  )
}
