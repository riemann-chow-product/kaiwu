import type { Metadata } from 'next'
import './globals.css'
import { SiteHeader } from '@/components/site-header'
import { SiteFooter } from '@/components/site-footer'

export const metadata: Metadata = {
  title: {
    default: '开物 · 开发者作品空间',
    template: '%s · 开物',
  },
  description:
    '开物是一个多租户的开发者作品空间。贴一个 GitHub 仓库地址，AI 读完代码自动写好介绍、打上标签、摆上货架。',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        <SiteHeader />
        <main>{children}</main>
        <SiteFooter />
      </body>
    </html>
  )
}
