const RISK_COPY = {
  healthy: 'Healthy (>30d)',
  warming: 'Warming Window',
  critical: 'Critical (≤2,000 ledgers)',
}

/**
 * Semantic TTL Heatmap Dot (`mvp.md` Section 5):
 *  - healthy (> 30 days): Emerald
 *  - warming (2,000 ledgers to 30 days): Amber
 *  - critical (<= 2,000 ledgers, Emergency Bypass active): Red
 */
export function Dot({ level, size = 14, label = '' }) {
  const style = { width: size, height: size }
  const titleText = label || RISK_COPY[level] || level

  if (level === 'healthy') {
    return (
      <span
        title={titleText}
        className="inline-block rounded-full bg-emerald transition-transform hover:scale-125"
        style={style}
      />
    )
  }
  if (level === 'warming') {
    return (
      <span
        title={titleText}
        className="inline-block rounded-full bg-amber transition-transform hover:scale-125"
        style={style}
      />
    )
  }
  return (
    <span
      title={titleText}
      className="inline-block rounded-full bg-red border-2 border-fg transition-transform hover:scale-125"
      style={style}
    />
  )
}

export function Legend() {
  return (
    <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted">
      <li className="flex items-center gap-2">
        <Dot level="healthy" size={12} />
        <span>Healthy (&gt; 30 days / &gt; 518,400 ledgers)</span>
      </li>
      <li className="flex items-center gap-2">
        <Dot level="warming" size={12} />
        <span>Warming Window (2,000 – 518,400 ledgers)</span>
      </li>
      <li className="flex items-center gap-2">
        <Dot level="critical" size={12} />
        <span>Critical Risk (&le; 2,000 ledgers · Emergency Bypass)</span>
      </li>
    </ul>
  )
}

export function RiskLabel({ level }) {
  const textColor =
    level === 'critical'
      ? 'text-red font-semibold'
      : level === 'warming'
        ? 'text-amber font-medium'
        : 'text-emerald font-medium'

  return (
    <span className={`inline-flex items-center gap-2 text-sm ${textColor}`}>
      <Dot level={level} size={10} />
      {RISK_COPY[level]}
    </span>
  )
}
