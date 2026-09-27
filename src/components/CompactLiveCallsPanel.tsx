import { CompactCallRow } from './CompactCallRow'
import { ChevronRightIcon, PhoneIcon } from './icons'
import type { LiveCall } from '../types'

const VISIBLE_LIMIT = 3

/** The "what's happening right now" companion card on the dashboard.
 * Designed with a matching header and footer to align seamlessly with KPI cards. */
export function CompactLiveCallsPanel({
  calls,
  onOpenCall,
  onViewAll,
}: {
  calls: LiveCall[]
  onOpenCall: (call: LiveCall) => void
  onViewAll: () => void
}) {
  const visible = calls.slice(0, VISIBLE_LIMIT)
  const remaining = calls.length - visible.length

  return (
    <div className="card flex h-full flex-col p-5">
      {/* Aligned Card Header */}
      <div className="flex items-center justify-between pb-3 border-b border-hairline">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-canvas text-muted">
            <PhoneIcon className="h-4 w-4" />
          </span>
          <h2 className="text-sm font-medium text-body">Live calls</h2>
          {calls.length > 0 && (
            <span className="flex items-center gap-1.5 rounded-full bg-pulse/10 px-2 py-0.5 text-[11px] font-semibold text-pulse">
              <span className="relative flex h-1.5 w-1.5" aria-hidden="true">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-pulse opacity-60" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-pulse" />
              </span>
              {calls.length} active
            </span>
          )}
        </div>

        {remaining > 0 && (
          <button
            type="button"
            onClick={onViewAll}
            className="text-xs font-medium text-pulse hover:underline"
          >
            +{remaining} more
          </button>
        )}
      </div>

      {/* Call List Body */}
      <div className="mt-3 flex-1">
        {calls.length === 0 ? (
          <div className="flex h-full min-h-[140px] items-center justify-center rounded-xl bg-canvas text-sm text-muted">
            No calls in progress
          </div>
        ) : (
          <ul className="flex flex-col divide-y divide-hairline">
            {visible.map((call) => (
              <CompactCallRow key={call.id} call={call} onOpen={onOpenCall} />
            ))}
          </ul>
        )}
      </div>

      {/* Aligned Card Footer */}
      <div className="mt-auto pt-3 border-t border-hairline flex items-center justify-between text-xs text-muted">
        <span>Real-time inbound activity</span>
        <button
          type="button"
          onClick={onViewAll}
          className="flex items-center gap-1 font-medium text-pulse hover:underline"
        >
          View full call log
          <ChevronRightIcon className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}
