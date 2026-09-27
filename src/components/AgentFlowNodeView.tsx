import { Handle, Position, type NodeProps } from '@xyflow/react'
import type { FlowNodeStatus } from '../types'

export type FlowNodeData = {
  label: string
  status?: FlowNodeStatus
  callsHandled: number
  confidenceFloor: number
  qNum?: string
  qId?: string
  qType?: string
  question?: string
}

/**
 * Clean Black and White Neobrutalist Flow Node:
 * - Pure white background (#ffffff)
 * - 20px rounded corners
 * - 2px solid black border (#000000)
 * - Solid offset box-shadow (6px 6px 0px #000000) with NO blur
 */
export function AgentFlowNodeView({ data, selected }: NodeProps & { data: FlowNodeData }) {
  return (
    <div
      className={`group relative cursor-pointer select-none rounded-[20px] bg-white p-5 text-left transition-all duration-150 ${
        selected ? '-translate-x-0.5 -translate-y-0.5' : 'hover:-translate-x-0.5 hover:-translate-y-0.5'
      }`}
      style={{
        width: 260,
        border: '2px solid #000000',
        boxShadow: selected ? '8px 8px 0px 0px #000000' : '6px 6px 0px 0px #000000',
      }}
    >
      {/* Handles — top target and bottom source for top-to-down tree flow */}
      <Handle
        type="target"
        position={Position.Top}
        id="top"
        style={{
          background: '#000000',
          border: '2.5px solid #ffffff',
          width: 12,
          height: 12,
          boxShadow: '0 0 0 2px rgba(0, 0, 0, 0.2)',
          cursor: 'crosshair',
        }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        style={{
          background: '#000000',
          border: '2.5px solid #ffffff',
          width: 12,
          height: 12,
          boxShadow: '0 0 0 2px rgba(0, 0, 0, 0.2)',
          cursor: 'crosshair',
        }}
      />

      {/* Header Row: Optional Node ID badge */}
      {data.qId && (
        <div className="mb-2 flex items-center justify-between">
          <span className="inline-flex items-center rounded border border-black/20 bg-zinc-100 px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider text-black">
            {data.qId}
          </span>
        </div>
      )}

      {/* Main Intent Title */}
      <p className="text-sm font-bold leading-snug text-black line-clamp-2">
        {data.label}
      </p>

      {/* Question / Detail Subtitle */}
      {data.question && data.question !== data.label && (
        <p className="mt-1.5 text-xs leading-relaxed text-zinc-600 line-clamp-2">
          {data.question}
        </p>
      )}
    </div>
  )
}
