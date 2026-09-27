import type { StatSeries } from '../types'
import { BarSparkline } from './BarSparkline'
import { ArrowDownRightIcon, ArrowUpRightIcon, CallLogIcon, ChevronRightIcon, MinusIcon } from './icons'

const TREND_ICON: Record<StatSeries['trend'], typeof ArrowUpRightIcon> = {
  up: ArrowUpRightIcon,
  down: ArrowDownRightIcon,
  flat: MinusIcon,
}

/** A `count`-format KPI card — headline number, delta, and an animated stacked bar sparkline.
 * Aligned with the dashboard's design system. */
export function StatCard({
  stat,
  onOpen,
}: {
  stat: StatSeries
  /** Clicking the card drills into the records behind this metric. */
  onOpen?: () => void
}) {
  const TrendIcon = TREND_ICON[stat.trend]

  return (
    <div
      onClick={onOpen}
      role={onOpen ? 'button' : undefined}
      tabIndex={onOpen ? 0 : undefined}
      onKeyDown={(e) => {
        if (onOpen && (e.key === 'Enter' || e.key === ' ')) onOpen()
      }}
      className={`card flex h-full flex-col p-5 text-left ${
        onOpen ? 'card-interactive group/stat cursor-pointer' : ''
      }`}
    >
      {/* Aligned Card Header */}
      <div className="flex items-center justify-between pb-3 border-b border-hairline">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-canvas text-muted">
            <CallLogIcon className="h-4 w-4" />
          </span>
          <p className="truncate text-sm font-medium text-body">{stat.label}</p>
        </div>
        {stat.delta && (
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
              stat.trend === 'up'
                ? 'bg-sage/15 text-sage'
                : stat.trend === 'down'
                  ? 'bg-critical/15 text-critical'
                  : 'bg-canvas text-muted'
            }`}
          >
            <TrendIcon className="h-3 w-3" />
            {stat.delta}
          </span>
        )}
      </div>

      {/* Main KPI Stat Display */}
      <div className="mt-3 flex items-baseline gap-2">
        <span className="font-display text-3xl font-semibold tabular-nums text-body">
          {stat.value}
        </span>
        <span className="text-xs text-muted">calls handled</span>
      </div>

      {/* Animated Interactive Bar Sparkline */}
      <div className="mt-2 flex-1">
        <BarSparkline series={stat.series} />
      </div>

      {/* Aligned Card Footer */}
      {onOpen && (
        <div className="mt-auto pt-3 border-t border-hairline flex items-center justify-between text-xs text-muted">
          <span>7-day volume composition</span>
          <span className="flex items-center gap-0.5 font-medium text-pulse group-hover/stat:underline">
            View details
            <ChevronRightIcon className="h-3.5 w-3.5" />
          </span>
        </div>
      )}
    </div>
  )
}
