import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="wrap" style={{ padding: '110px 32px 130px', maxWidth: 640 }}>
      <div className="eyebrow">404</div>
      <h1 className="display" style={{ fontSize: 44, marginTop: 14 }}>
        这里什么都没有。
      </h1>
      <p className="lede" style={{ marginTop: 16 }}>
        页面可能被删了，或者地址打错了。
      </p>
      <div className="row" style={{ marginTop: 26 }}>
        <Link className="btn" href="/">
          回首页
        </Link>
        <Link className="btn ghost" href="/explore">
          逛逛全部作品
        </Link>
      </div>
    </div>
  )
}
