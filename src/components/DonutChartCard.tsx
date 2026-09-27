import { useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { ArrowDownRightIcon, ArrowUpRightIcon, ChevronRightIcon, MinusIcon } from './icons'

const SIZE = 152
const STROKE = 16
const RADIUS = (SIZE - STROKE) / 2
const CIRCUMFERENCE = 2 * Math.PI * RADIUS
const CENTER = SIZE / 2

export interface DonutSegment {
  label: string
  value: number
  colorClassName: string
}

interface HoverState {
  segment: DonutSegment
  percent: number
  x: number
  y: number
}

/** A full-size, standalone breakdown chart — every category behind a percent
 * KPI gets its own card with room for the real title, a legend that never
 * truncates, and an animated cursor-following tooltip on every segment. */
export function DonutChartCard({
  title,
  icon,
  segments,
  centerLabel,
  value,
  target,
  delta,
  trend,
  onOpen,
}: {
  title: string
  icon: ReactNode
  segments: DonutSegment[]
  centerLabel: string
  /** The headline percent as a number, for the target comparison below. */
  value: number
  target?: number
  delta?: string
  trend?: 'up' | 'down' | 'flat'
  onOpen?: () => void
}) {
  const [hover, setHover] = useState<HoverState | null>(null)
  const chartRef = useRef<HTMLDivElement>(null)
  const total = segments.reduce((sum, s) => sum + s.value, 0)
  let cumulative = 0

  function showAt(clientX: number, clientY: number, seg: DonutSegment) {
    const rect = chartRef.current?.getBoundingClientRect()
    if (!rect) return
    setHover({
      segment: seg,
      percent: total > 0 ? Math.round((seg.value / total) * 100) : 0,
      x: clientX - rect.left,
      y: clientY - rect.top,
    })
  }

  function showCentered(seg: DonutSegment) {
    setHover({
      segment: seg,
      percent: total > 0 ? Math.round((seg.value / total) * 100) : 0,
      x: CENTER,
      y: CENTER,
    })
  }

  const TrendIcon = trend === 'up' ? ArrowUpRightIcon : trend === 'down' ? ArrowDownRightIcon : MinusIcon
  const onTarget = target === undefined || value >= target

  return (
    <div
      onClick={onOpen}
      role={onOpen ? 'button' : undefined}
      tabIndex={onOpen ? 0 : undefined}
      onKeyDown={(e) => {
        if (onOpen && (e.key === 'Enter' || e.key === ' ')) onOpen()
      }}
      className={`card flex h-full flex-col p-5 text-left ${
        onOpen ? 'card-interactive group/donut cursor-pointer' : ''
      }`}
    >
      {/* Aligned Card Header */}
      <div className="flex items-center justify-between pb-3 border-b border-hairline">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-canvas text-muted">
            {icon}
          </span>
          <p className="truncate text-sm font-medium text-body">{title}</p>
        </div>
        {delta && (
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
              trend === 'up'
                ? 'bg-sage/15 text-sage'
                : trend === 'down'
                  ? 'bg-critical/15 text-critical'
                  : 'bg-canvas text-muted'
            }`}
          >
            <TrendIcon className="h-3 w-3" />
            {delta}
          </span>
        )}
      </div>

      {/* Donut Chart Area with Dynamic Hover Animations */}
      <div
        ref={chartRef}
        className="relative mx-auto mt-5 flex items-center justify-center select-none"
        style={{ width: SIZE, height: SIZE }}
        onMouseLeave={() => setHover(null)}
      >
        <svg
          width={SIZE}
          height={SIZE}
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          role="img"
          aria-label={`${title} — ${centerLabel}`}
          className="overflow-visible"
        >
          <g transform={`rotate(-90 ${CENTER} ${CENTER})`}>
            {/* Base Background Track */}
            <circle
              cx={CENTER}
              cy={CENTER}
              r={RADIUS}
              fill="none"
              strokeWidth={STROKE}
              className="text-hairline"
              stroke="currentColor"
            />

            {/* Interactive Segments */}
            {total > 0 &&
              segments
                .filter((s) => s.value > 0)
                .map((seg) => {
                  const len = (seg.value / total) * CIRCUMFERENCE
                  const offset = cumulative
                  cumulative += len
                  const isHover = hover?.segment.label === seg.label

                  return (
                    <circle
                      key={seg.label}
                      cx={CENTER}
                      cy={CENTER}
                      r={RADIUS}
                      fill="none"
                      strokeWidth={isHover ? STROKE + 5 : STROKE}
                      strokeDasharray={`${len} ${CIRCUMFERENCE - len}`}
                      strokeDashoffset={-offset}
                      style={{
                        opacity: hover && !isHover ? 0.35 : 1,
                        transition: 'stroke-width 200ms ease, opacity 200ms ease',
                      }}
                      className={`${seg.colorClassName} cursor-pointer`}
                      stroke="currentColor"
                      tabIndex={0}
                      onMouseEnter={(e) => showAt(e.clientX, e.clientY, seg)}
                      onMouseMove={(e) => showAt(e.clientX, e.clientY, seg)}
                      onFocus={() => showCentered(seg)}
                      onBlur={() => setHover(null)}
                    />
                  )
                })}
          </g>
        </svg>

        {/* Dynamic Center Metric Display */}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <span
            className={`font-display text-2xl font-bold tracking-tight transition-all duration-200 ${
              hover ? hover.segment.colorClassName : 'text-body'
            }`}
          >
            {hover ? `${hover.percent}%` : centerLabel}
          </span>
          <span className="max-w-[90px] truncate text-[11px] font-medium text-muted transition-all duration-200">
            {hover ? hover.segment.label : 'Overall'}
          </span>
        </div>

        {/* Animated Floating Tooltip on Segment Hover */}
        {hover && (
          <div
            className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-[calc(100%+14px)] rounded-xl border border-hairline/60 bg-ink-teal/95 px-3 py-2 text-xs text-mist shadow-xl backdrop-blur-md transition-all duration-150 animate-in fade-in zoom-in-95"
            style={{ left: hover.x, top: hover.y }}
          >
            <div className="flex items-center gap-1.5 font-semibold text-white">
              <span
                className={`h-2 w-2 rounded-full ${hover.segment.colorClassName}`}
                style={{ backgroundColor: 'currentColor' }}
              />
              {hover.segment.label}
            </div>
            <div className="mt-1 flex items-baseline gap-2 font-mono text-[11px] text-mist/80">
              <span>{hover.segment.value.toLocaleString()} calls</span>
              <span className="font-bold text-white">({hover.percent}%)</span>
            </div>
          </div>
        )}
      </div>

      {/* Target Comparison Indicator */}
      {target !== undefined && (
        <p className="mt-3 text-center text-xs text-faint">
          Target {target}%{' '}
          <span className={onTarget ? 'text-sage font-medium' : 'text-amber font-medium'}>
            · {onTarget ? 'Above target' : 'Below target'}
          </span>
        </p>
      )}

      {/* Interactive Legend List Synchronized with Chart Hover */}
      <ul className="mt-4 flex flex-1 flex-col gap-1.5">
        {segments.map((seg) => {
          const percent = total > 0 ? Math.round((seg.value / total) * 100) : 0
          const isHovered = hover?.segment.label === seg.label

          return (
            <li
              key={seg.label}
              onMouseEnter={() => showCentered(seg)}
              onMouseLeave={() => setHover(null)}
              className={`flex items-center justify-between gap-3 rounded-xl px-2.5 py-1.5 text-sm transition-all duration-150 ${
                isHovered
                  ? 'bg-surface-hover shadow-xs scale-[1.01]'
                  : 'hover:bg-surface-hover/60'
              }`}
            >
              <span className="flex min-w-0 items-center gap-2 text-body">
                <span
                  className={`h-2 w-2 shrink-0 rounded-full ${seg.colorClassName} transition-transform duration-150 ${
                    isHovered ? 'scale-125' : ''
                  }`}
                  style={{ backgroundColor: 'currentColor' }}
                  aria-hidden="true"
                />
                <span className={`truncate ${isHovered ? 'font-semibold text-body' : ''}`}>
                  {seg.label}
                </span>
              </span>
              <span className="shrink-0 font-mono text-xs text-muted">
                {seg.value.toLocaleString()} · <span className={isHovered ? 'font-bold text-body' : ''}>{percent}%</span>
              </span>
            </li>
          )
        })}
      </ul>

      {/* Aligned Card Footer */}
      {onOpen && (
        <div className="mt-auto pt-3 border-t border-hairline flex items-center justify-between text-xs text-muted">
          <span>Detailed category distribution</span>
          <span className="flex items-center gap-0.5 font-medium text-pulse group-hover/donut:underline">
            View details
            <ChevronRightIcon className="h-3.5 w-3.5" />
          </span>
        </div>
      )}
    </div>
  )
}
