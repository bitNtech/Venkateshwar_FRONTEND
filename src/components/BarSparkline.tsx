import { useState } from 'react'

const HEIGHT = 72
const GAP = 8

type ConfidenceTier = 'high' | 'review' | 'low'

const TIER_CONFIG: Record<
  ConfidenceTier,
  { label: string; hex: string }
> = {
  high: {
    label: 'High confidence',
    hex: '#1e9e67',
  },
  review: {
    label: 'Needs review',
    hex: '#f4c542',
  },
  low: {
    label: 'Low confidence',
    hex: '#d9383a',
  },
}

const TIERS: ConfidenceTier[] = ['high', 'review', 'low']

export function BarSparkline({
  series,
}: {
  series: { label: string; value: number; byConfidence: Record<ConfidenceTier, number> }[]
}) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)

  if (series.length === 0) return null
  const max = Math.max(...series.map((d) => d.value))

  return (
    <div className="flex flex-col">
      {/* Bars Chart Area */}
      <div
        className="relative flex items-end pt-8"
        style={{ height: HEIGHT + 32, gap: GAP }}
        onMouseLeave={() => setHoveredIdx(null)}
      >
        {series.map((point, i) => {
          const isLast = i === series.length - 1
          const isHovered = hoveredIdx === i
          const barHeight = max === 0 ? 4 : Math.max(8, (point.value / max) * HEIGHT)

          return (
            <div
              key={point.label}
              className="group relative flex flex-1 cursor-pointer flex-col items-center justify-end"
              style={{ height: '100%' }}
              onMouseEnter={() => setHoveredIdx(i)}
              onFocus={() => setHoveredIdx(i)}
              onBlur={() => setHoveredIdx(null)}
              tabIndex={0}
            >
              {/* Animated Floating Tooltip on Hover */}
              {isHovered && (
                <div
                  className="pointer-events-none absolute -top-1 z-20 -translate-y-full whitespace-nowrap rounded-xl border border-hairline/60 bg-ink-teal/95 px-3 py-2 text-xs text-mist shadow-xl backdrop-blur-md transition-all duration-150 animate-in fade-in-0 zoom-in-95"
                >
                  <div className="flex items-center justify-between gap-3 font-semibold text-white">
                    <span>{point.label}</span>
                    <span className="font-mono text-xs">{point.value} calls</span>
                  </div>
                  <div className="mt-1.5 flex items-center gap-2 font-mono text-[10px] text-mist/80">
                    <span className="flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: TIER_CONFIG.high.hex }} />
                      {point.byConfidence.high}
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: TIER_CONFIG.review.hex }} />
                      {point.byConfidence.review}
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: TIER_CONFIG.low.hex }} />
                      {point.byConfidence.low}
                    </span>
                  </div>
                </div>
              )}

              {/* Stacked Bar Container with Vibrant Colors and Hover Animations */}
              <div
                className="w-full flex flex-col-reverse overflow-hidden rounded-t-[5px] outline-none"
                style={{
                  height: barHeight,
                  transform: isHovered ? 'scaleY(1.06) scaleX(1.04)' : 'scale(1)',
                  transformOrigin: 'bottom',
                  filter: isHovered
                    ? 'brightness(1.1) drop-shadow(0 4px 10px rgba(0, 0, 0, 0.18))'
                    : 'none',
                  opacity: hoveredIdx !== null ? (isHovered ? 1 : 0.45) : isLast ? 1 : 0.88,
                  transition: 'all 200ms cubic-bezier(0.34, 1.56, 0.64, 1)',
                }}
              >
                {TIERS.map((tier) => {
                  const count = point.byConfidence[tier]
                  if (count <= 0) return null
                  const segHeight = (count / point.value) * barHeight
                  return (
                    <div
                      key={tier}
                      style={{
                        height: segHeight,
                        backgroundColor: TIER_CONFIG[tier].hex,
                        transition: 'opacity 150ms ease',
                      }}
                    />
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* Day Axis Labels Below Bars */}
      <div className="mt-2.5 flex items-center text-center" style={{ gap: GAP }}>
        {series.map((point, i) => (
          <span
            key={point.label}
            className={`flex-1 text-[11px] font-mono transition-all duration-150 ${
              hoveredIdx === i
                ? 'font-bold text-pulse scale-105'
                : i === series.length - 1
                  ? 'font-semibold text-body'
                  : 'text-muted'
            }`}
          >
            {point.label}
          </span>
        ))}
      </div>

      {/* Confidence Tier Legend */}
      <ul className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-hairline/60 pt-2.5">
        {TIERS.map((tier) => (
          <li key={tier} className="flex items-center gap-1.5 text-[11px] text-muted">
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: TIER_CONFIG[tier].hex }}
              aria-hidden="true"
            />
            {TIER_CONFIG[tier].label}
          </li>
        ))}
      </ul>
    </div>
  )
}
