interface Props {
  seed: string
  accent: string
  glyph: string
  label?: string
  image?: string | null
  name?: string
  ratio?: 'card' | 'wide'
}

function hash(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return Math.abs(h)
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ]
}

const rgba = (hex: string, a: number) => {
  const [r, g, b] = hexToRgb(hex)
  return `rgba(${r},${g},${b},${a})`
}

/**
 * 没有截图时使用的「版画」封面：
 * 由项目名哈希决定的确定性构图 —— 同一个项目每次渲染都一致。
 */
export function CoverArt({ seed, accent, glyph, label, image, name }: Props) {
  if (image) {
    return <img src={image} alt={name ?? label ?? ''} loading="lazy" />
  }

  const h = hash(seed)
  const uid = `c${h.toString(36).slice(0, 6)}`
  const angle = h % 360
  const cx = 24 + (h % 52)
  const cy = 18 + ((h >> 3) % 46)
  const ringCount = 3 + (h % 3)
  const W = 400
  const H = 250

  return (
    <div className="plate" aria-hidden="true">
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id={`${uid}-bg`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#fffdfa" />
            <stop offset="100%" stopColor="#f1ece1" />
          </linearGradient>
          <radialGradient id={`${uid}-glow`} cx={`${cx}%`} cy={`${cy}%`} r="62%">
            <stop offset="0%" stopColor={rgba(accent, 0.22)} />
            <stop offset="60%" stopColor={rgba(accent, 0.06)} />
            <stop offset="100%" stopColor={rgba(accent, 0)} />
          </radialGradient>
          <pattern id={`${uid}-grid`} width="25" height="25" patternUnits="userSpaceOnUse">
            <path d="M25 0H0V25" fill="none" stroke={rgba(accent, 0.1)} strokeWidth="0.6" />
          </pattern>
          <clipPath id={`${uid}-clip`}>
            <rect width={W} height={H} />
          </clipPath>
        </defs>

        <g clipPath={`url(#${uid}-clip)`}>
          <rect width={W} height={H} fill={`url(#${uid}-bg)`} />
          <rect width={W} height={H} fill={`url(#${uid}-grid)`} />
          <rect width={W} height={H} fill={`url(#${uid}-glow)`} />

          <g transform={`translate(${W / 2} ${H / 2}) rotate(${angle})`}>
            {Array.from({ length: ringCount }).map((_, i) => (
              <circle
                key={i}
                r={34 + i * 26}
                fill="none"
                stroke={rgba(accent, 0.26 - i * 0.05)}
                strokeWidth="0.8"
                strokeDasharray={i % 2 === 0 ? undefined : '3 7'}
              />
            ))}
            <line x1={-150} y1="0" x2={150} y2="0" stroke={rgba(accent, 0.16)} strokeWidth="0.8" />
            <line x1="0" y1={-110} x2="0" y2={110} stroke={rgba(accent, 0.16)} strokeWidth="0.8" />
          </g>

          {/* 角标 */}
          <g stroke={rgba(accent, 0.42)} strokeWidth="1">
            <path d="M12 22V12h10" fill="none" />
            <path d={`M${W - 12} 22V12h-10`} fill="none" />
            <path d={`M12 ${H - 22}v10h10`} fill="none" />
            <path d={`M${W - 12} ${H - 22}v10h-10`} fill="none" />
          </g>
        </g>
      </svg>
      <span className="plate-glyph" style={{ color: accent }}>
        {glyph}
      </span>
      {label ? <span className="plate-label">{label}</span> : null}
    </div>
  )
}
