/** 生成 shields 风格的动态徽章 SVG（核对分 + 颜色分档） */
const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

export function scoreColor(score: number | null | undefined): string {
  if (score == null) return '#888780'
  if (score >= 70) return '#1D9E75'
  if (score >= 50) return '#BA7517'
  return '#E24B4A'
}

export function badgeSvg({
  label,
  value,
  color,
}: {
  label: string
  value: string
  color: string
}): string {
  const labelW = Math.max(46, label.length * 7 + 14)
  const valueW = Math.max(42, value.length * 7 + 16)
  const w = labelW + valueW
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="20" role="img" aria-label="${esc(label)}: ${esc(value)}">
<rect width="${labelW}" height="20" fill="#3C3489"/>
<rect x="${labelW}" width="${valueW}" height="20" fill="${color}"/>
<g fill="#ffffff" font-family="Verdana,DejaVu Sans,Geneva,sans-serif" font-size="11" text-anchor="middle">
<text x="${labelW / 2}" y="14">${esc(label)}</text>
<text x="${labelW + valueW / 2}" y="14">${esc(value)}</text>
</g>
</svg>`
}

export function badgeResponse(svg: string): Response {
  return new Response(svg, {
    headers: {
      'Content-Type': 'image/svg+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=120, s-maxage=120',
      'Access-Control-Allow-Origin': '*',
    },
  })
}
