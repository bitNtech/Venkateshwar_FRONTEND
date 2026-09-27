import { useState } from 'react'
import { Dropdown } from './Dropdown'
import type { FlowNodeStatus } from '../types'

/** Adds a new branch to the flow — connected from an existing node, so the
 * tree never has an orphan. */
export function AgentBranchForm({
  parentOptions,
  onCreate,
}: {
  parentOptions: { id: string; label: string }[]
  onCreate: (input: { label: string; parentId: string; status?: FlowNodeStatus }) => void
}) {
  const [label, setLabel] = useState('')
  const [parentId, setParentId] = useState(parentOptions[0]?.id ?? '')

  return (
    <div className="flex flex-col gap-5">
      <div>
        <label className="text-xs font-semibold uppercase tracking-wide text-muted" htmlFor="branch-label">
          Branch name
        </label>
        <input
          id="branch-label"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="e.g. Referral request"
          className="input mt-1.5 w-full"
        />
      </div>

      <div>
        <label className="text-xs font-semibold uppercase tracking-wide text-muted" htmlFor="branch-parent">
          Connects from
        </label>
        <Dropdown
          id="branch-parent"
          value={parentId}
          onChange={setParentId}
          options={parentOptions.map((p) => ({ value: p.id, label: p.label }))}
          variant="pill"
          size="sm"
          className="mt-1.5 w-full"
        />
      </div>

      <button
        type="button"
        disabled={!label.trim() || !parentId}
        onClick={() => onCreate({ label: label.trim(), parentId })}
        className="btn-primary self-start"
      >
        Add branch
      </button>
    </div>
  )
}
