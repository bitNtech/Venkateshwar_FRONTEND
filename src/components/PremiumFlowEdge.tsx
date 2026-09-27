import { getBezierPath, type EdgeProps } from '@xyflow/react'

const EDGE_COLOR = '#000000'

export function PremiumFlowEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  selected,
}: EdgeProps) {
  const arrowId = `pfea-${id}`

  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  })

  return (
    <>
      <defs>
        <marker
          id={arrowId}
          markerWidth="8"
          markerHeight="8"
          refX="5"
          refY="3"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <path d="M0,0 L0,6 L6,3 z" fill={EDGE_COLOR} />
        </marker>
      </defs>

      {/* Clean black connector line */}
      <path
        d={edgePath}
        fill="none"
        stroke={EDGE_COLOR}
        strokeWidth={selected ? 2.5 : 1.75}
        strokeLinecap="round"
        markerEnd={`url(#${arrowId})`}
        style={{ transition: 'stroke-width 150ms' }}
      />
    </>
  )
}
