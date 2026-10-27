const SHORT: Record<string, string> = {
  'AI 基础设施': 'AI 基设',
  智能体: '智能体',
  检索与数据: '检索数据',
  开发工具: '开发工具',
  效率工具: '效率工具',
  前端与界面: '前端界面',
}

/** 纯 SVG 能力雷达：不依赖图表库，服务端即可渲染 */
export function CapabilityRadar({
  categories,
  values,
  size = 300,
}: {
  categories: string[]
  values: number[]
  size?: number
}) {
  const cx = size / 2
  const cy = size / 2
  const r = size / 2 - 66
  const n = Math.max(1, categories.length)
  const angle = (i: number) => (Math.PI * 2 * i) / n - Math.PI / 2
  const at = (i: number, val: number) => {
    const rr = (Math.max(0, Math.min(100, val)) / 100) * r
    return { x: cx + Math.cos(angle(i)) * rr, y: cy + Math.sin(angle(i)) * rr }
  }
  const ringPoints = (frac: number) =>
    categories
      .map((_, i) => {
        const rr = frac * r
        return `${cx + Math.cos(angle(i)) * rr},${cy + Math.sin(angle(i)) * rr}`
      })
      .join(' ')

  const valuePoints = values.map((v, i) => {
    const p = at(i, v)
    return `${p.x},${p.y}`
  }).join(' ')

  const labelR = r + 16

  return (
    <svg viewBox={`0 0 ${size} ${size}`} width="100%" role="img" aria-label="能力雷达图" style={{ maxWidth: size }}>
      {[0.25, 0.5, 0.75, 1].map((f) => (
        <polygon key={f} points={ringPoints(f)} fill="none" stroke="var(--line)" strokeWidth={0.6} />
      ))}
      {categories.map((_, i) => {
        const p = at(i, 100)
        return <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="var(--line)" strokeWidth={0.6} />
      })}
      <polygon points={valuePoints} fill="var(--accent)" fillOpacity={0.16} stroke="var(--accent)" strokeWidth={1.5} />
      {values.map((v, i) => {
        const p = at(i, v)
        return <circle key={i} cx={p.x} cy={p.y} r={2.2} fill="var(--accent)" />
      })}
      {categories.map((c, i) => {
        const lx = cx + Math.cos(angle(i)) * labelR
        const ly = cy + Math.sin(angle(i)) * labelR
        const anchor = lx < cx - 6 ? 'end' : lx > cx + 6 ? 'start' : 'middle'
        return (
          <text key={c} x={lx} y={ly} textAnchor={anchor} dominantBaseline="middle" fontSize={11} fill="var(--muted)">
            {SHORT[c] ?? c}
          </text>
        )
      })}
    </svg>
  )
}
