import { useState } from 'react'
import type { FlowNodeData } from './AgentFlowNodeView'
import { CloseIcon } from './icons'
import { Slider } from './Slider'

/** The edit form behind every node — rename it, retune its confidence floor,
 * or remove it. Calls trained-on stays read-only: that number comes from
 * ingested call history, not a hand edit. */
export function AgentNodeEditor({
  data,
  canDelete,
  onSave,
  onDelete,
}: {
  data: FlowNodeData
  canDelete: boolean
  onSave: (next: Pick<FlowNodeData, 'label' | 'status' | 'confidenceFloor'>) => void
  onDelete: () => void
}) {
  const [label, setLabel] = useState(data.label)
  const [floor, setFloor] = useState(Math.round(data.confidenceFloor * 100))

  const dirty =
    label !== data.label || floor !== Math.round(data.confidenceFloor * 100)

  return (
    <div className="flex flex-col gap-5">
      <div>
        <label className="text-xs font-semibold uppercase tracking-wide text-muted" htmlFor="node-label">
          Branch name
        </label>
        <input
          id="node-label"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          className="input mt-1.5 w-full"
        />
      </div>

      <div>
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold uppercase tracking-wide text-muted" htmlFor="node-floor">
            Confidence floor
          </label>
          <span className="font-mono text-xs text-body">{floor}%</span>
        </div>
        <Slider
          id="node-floor"
          min={0}
          max={100}
          value={floor}
          label="Confidence floor"
          onChange={setFloor}
          className="mt-1.5"
        />
        <p className="mt-1 text-xs text-muted">
          Below this, a call on this branch hands off to staff instead of AICA answering alone.
        </p>
      </div>

      <div className="rounded-xl border border-hairline bg-canvas p-3">
        <p className="text-xs text-muted">Calls trained on</p>
        <p className="mt-1 font-mono text-lg text-body">{data.callsHandled.toLocaleString()}</p>
        <p className="mt-1 text-xs text-faint">
          From ingested call history — updates when the corpus is re-mined, not by hand.
        </p>
      </div>

      <div className="flex items-center gap-2 border-t border-hairline pt-4">
        <button
          type="button"
          disabled={!dirty || !label.trim()}
          onClick={() => onSave({ label: label.trim(), status: data.status, confidenceFloor: floor / 100 })}
          className="btn-primary"
        >
          Save changes
        </button>
        {canDelete ? (
          <button type="button" onClick={onDelete} className="btn-danger">
            <CloseIcon className="h-3.5 w-3.5" />
            Delete branch
          </button>
        ) : (
          <span className="text-xs text-faint">This is the entry point — it can't be deleted.</span>
        )}
      </div>
    </div>
  )
}
