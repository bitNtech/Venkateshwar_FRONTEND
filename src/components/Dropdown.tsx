import { useState, useRef, useEffect, type ReactNode } from 'react'
import { ChevronDownIcon, CheckIcon } from './icons'

export interface DropdownOption<T extends string = string> {
  value: T
  label: string
  icon?: ReactNode
  dotColor?: string
  badge?: string
  desc?: string
}

export interface DropdownProps<T extends string = string> {
  value: T
  onChange: (value: T) => void
  options: DropdownOption<T>[]
  label?: string
  icon?: ReactNode
  placeholder?: string
  variant?: 'default' | 'pill' | 'compact'
  size?: 'sm' | 'md'
  className?: string
  menuClassName?: string
  align?: 'left' | 'right'
  disabled?: boolean
  id?: string
}

export function Dropdown<T extends string = string>({
  value,
  onChange,
  options,
  label,
  icon,
  placeholder = 'Select option...',
  variant = 'default',
  size = 'md',
  className = '',
  menuClassName = '',
  align = 'left',
  disabled = false,
  id,
}: DropdownProps<T>) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const selectedOption = options.find((opt) => opt.value === value)

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown)
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  const sizeClasses = {
    sm: 'text-xs px-2.5 py-1.5 gap-1.5',
    md: 'text-sm px-3.5 py-2 gap-2',
  }[size]

  const variantClasses = {
    default: 'rounded-xl border border-hairline bg-surface hover:bg-surface-hover/80 hover:border-track',
    pill: 'rounded-full border border-hairline bg-surface hover:bg-surface-hover/80 hover:border-track',
    compact: 'rounded-xl border border-hairline bg-canvas hover:bg-surface-hover/80 hover:border-track',
  }[variant]

  return (
    <div
      ref={containerRef}
      className={`relative inline-block text-left ${className}`}
      id={id}
    >
      {label && (
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted">
          {label}
        </label>
      )}

      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={`group flex w-full items-center justify-between text-body transition-all duration-150 cursor-pointer focus:outline-none focus:ring-2 focus:ring-pulse/25 focus:border-pulse ${variantClasses} ${sizeClasses} ${
          isOpen ? 'border-pulse ring-2 ring-pulse/20 shadow-xs' : 'shadow-2xs'
        } ${disabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}`}
      >
        <span className="flex items-center gap-2 truncate">
          {icon && <span className="text-muted shrink-0 group-hover:text-body transition-colors">{icon}</span>}
          {selectedOption?.dotColor && (
            <span
              className="h-2 w-2 rounded-full shrink-0"
              style={{ backgroundColor: selectedOption.dotColor }}
            />
          )}
          <span className="font-medium truncate">
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </span>

        <ChevronDownIcon
          className={`h-3.5 w-3.5 shrink-0 text-muted transition-transform duration-200 ml-1.5 ${
            isOpen ? 'rotate-180 text-pulse' : 'group-hover:text-body'
          }`}
        />
      </button>

      {/* Custom Popover Dropdown Menu */}
      {isOpen && (
        <div
          role="listbox"
          className={`absolute ${align === 'right' ? 'right-0' : 'left-0'} mt-1.5 z-50 min-w-[210px] w-max max-w-xs rounded-2xl border border-hairline bg-white/95 p-1.5 shadow-xl backdrop-blur-md animate-in fade-in-0 zoom-in-95 duration-150 origin-top ${menuClassName}`}
        >
          <div className="max-h-64 overflow-y-auto space-y-0.5 py-0.5">
            {options.map((opt) => {
              const isSelected = opt.value === value

              return (
                <div
                  key={opt.value}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    onChange(opt.value)
                    setIsOpen(false)
                  }}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      onChange(opt.value)
                      setIsOpen(false)
                    }
                  }}
                  className={`group flex items-center justify-between gap-3 rounded-xl px-3 py-2 text-xs font-medium cursor-pointer transition-all duration-150 select-none ${
                    isSelected
                      ? 'bg-pulse/10 text-pulse font-semibold'
                      : 'text-body hover:bg-surface-hover hover:text-body-dark'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    {opt.icon && (
                      <span className={`shrink-0 ${isSelected ? 'text-pulse' : 'text-muted'}`}>
                        {opt.icon}
                      </span>
                    )}
                    {opt.dotColor && (
                      <span
                        className="h-2 w-2 rounded-full shrink-0"
                        style={{ backgroundColor: opt.dotColor }}
                      />
                    )}
                    <div className="flex flex-col truncate">
                      <span className="truncate">{opt.label}</span>
                      {opt.desc && (
                        <span className="text-[10px] font-normal text-muted truncate">
                          {opt.desc}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {opt.badge && (
                      <span className="rounded bg-canvas border border-hairline px-1.5 py-0.5 text-[9px] font-mono text-muted">
                        {opt.badge}
                      </span>
                    )}
                    {isSelected && (
                      <CheckIcon className="h-3.5 w-3.5 text-pulse shrink-0 animate-in zoom-in-50" />
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
