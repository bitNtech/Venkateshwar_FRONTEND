export function Slider({
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  id,
  label,
  disabled = false,
  className = '',
  showFill = true,
}: {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  id?: string
  label?: string
  disabled?: boolean
  className?: string
  showFill?: boolean
}) {
  const clamped = Math.min(max, Math.max(min, value))
  const pct = max > min ? ((clamped - min) / (max - min)) * 100 : 0

  return (
    <div className={`group relative flex flex-1 items-center select-none py-1.5 ${className}`}>
      {/* Simple track line */}
      <div className="relative h-1 w-full rounded-full bg-slate-200 overflow-hidden">
        {/* Active filled line */}
        {showFill && (
          <div
            className="h-full rounded-full bg-pulse transition-[width] duration-75"
            style={{ width: `${pct}%` }}
          />
        )}
      </div>

      {/* Accessible native range input overlay */}
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={clamped}
        disabled={disabled}
        aria-label={label}
        aria-valuenow={clamped}
        aria-valuemin={min}
        aria-valuemax={max}
        onChange={(e) => onChange(Number(e.target.value))}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0 focus-visible:outline-none disabled:cursor-not-allowed"
      />

      {/* Radio knob / thumb */}
      <div
        className="pointer-events-none absolute top-1/2 h-3.5 w-3.5 -translate-y-1/2 -translate-x-1/2 rounded-full border-2 border-white bg-pulse shadow-sm transition-[left,transform] duration-75 group-hover:scale-110 group-focus-within:ring-2 group-focus-within:ring-pulse group-focus-within:ring-offset-2"
        style={{ left: `calc(7px + (${pct} / 100) * (100% - 14px))` }}
      />
    </div>
  )
}
