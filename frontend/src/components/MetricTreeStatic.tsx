'use client'

import { useCallback } from 'react'
import ReactFlow, {
    MiniMap,
    Controls,
    Background,
    BackgroundVariant,
    useNodesState,
    useEdgesState,
    Handle,
    Position,
    type Node,
    type Edge,
} from 'reactflow'
import 'reactflow/dist/style.css'
import CustomMetricNode from './CustomMetricNode'

// ── Register custom node type ──
const nodeTypes = {
    customMetric: CustomMetricNode,
}

// ── Static node data ──
// Positions are manually tuned for a clean hierarchical layout.
// X-axis spacing: ~250px between siblings, Y-axis: ~160px between levels.

const NODE_DEFS: Array<{
    id: string
    label: string
    score: number
    weight: number
    trend: 'up' | 'down' | 'flat'
    errorLog?: string
    position: { x: number; y: number }
}> = [
        // Level 1 — Root
        {
            id: 'poi',
            label: 'Perfect Order Index',
            score: 83.7,
            weight: 100,
            trend: 'up',
            position: { x: 520, y: 0 },
        },

        // Level 2
        {
            id: 'otd',
            label: 'On-Time Delivery',
            score: 63.6,
            weight: 40,
            trend: 'down',
            position: { x: 150, y: 160 },
        },
        {
            id: 'oa',
            label: 'Order Accuracy',
            score: 99.0,
            weight: 35,
            trend: 'up',
            position: { x: 520, y: 160 },
        },
        {
            id: 'dfr',
            label: 'Damage Free Rate',
            score: 99.5,
            weight: 25,
            trend: 'flat',
            position: { x: 880, y: 160 },
        },

        // Level 3 (under OTD)
        {
            id: 'wpt',
            label: 'Warehouse Processing',
            score: 63.6,
            weight: 60,
            trend: 'down',
            position: { x: 20, y: 320 },
        },
        {
            id: 'tt',
            label: 'Transit Time',
            score: 95.0,
            weight: 40,
            trend: 'up',
            position: { x: 300, y: 320 },
        },

        // Level 4 (under Warehouse Processing)
        {
            id: 'pick',
            label: 'Picking',
            score: 98.0,
            weight: 30,
            trend: 'up',
            position: { x: -140, y: 480 },
        },
        {
            id: 'label',
            label: 'Label Generation',
            score: 5.0,
            weight: 40,
            trend: 'down',
            errorLog: '401_UNAUTHORIZED',
            position: { x: 110, y: 480 },
        },
        {
            id: 'pack',
            label: 'Packing',
            score: 96.0,
            weight: 30,
            trend: 'flat',
            position: { x: 360, y: 480 },
        },
    ]

// ── Build React Flow nodes ──
const nodes: Node[] = NODE_DEFS.map((n) => ({
    id: n.id,
    type: 'customMetric',
    position: n.position,
    data: {
        label: n.label,
        score: n.score,
        weight: n.weight,
        trend: n.trend,
        errorLog: n.errorLog,
    },
}))

// ── Edge definitions ──
// Hierarchy: poi → [otd, oa, dfr], otd → [wpt, tt], wpt → [pick, label, pack]
const EDGE_DEFS: Array<{ source: string; target: string }> = [
    { source: 'poi', target: 'otd' },
    { source: 'poi', target: 'oa' },
    { source: 'poi', target: 'dfr' },
    { source: 'otd', target: 'wpt' },
    { source: 'otd', target: 'tt' },
    { source: 'wpt', target: 'pick' },
    { source: 'wpt', target: 'label' },
    { source: 'wpt', target: 'pack' },
]

// Look up score & weight for a node by id
function findNode(id: string) {
    return NODE_DEFS.find((n) => n.id === id)
}

const edges: Edge[] = EDGE_DEFS.map(({ source, target }) => {
    const child = findNode(target)
    const isCriticalBottleneck =
        child !== undefined && child.score < 50 && child.weight >= 30

    return {
        id: `e-${source}-${target}`,
        source,
        target,
        type: 'smoothstep',
        animated: isCriticalBottleneck,
        style: {
            stroke: isCriticalBottleneck ? '#ef4444' : '#94a3b8',
            strokeWidth: isCriticalBottleneck ? 3 : 1.5,
        },
    }
})

// ── Main component ──
export default function MetricTreeStatic() {
    const [nds, setNds, onNodesChange] = useNodesState(nodes)
    const [eds, setEds, onEdgesChange] = useEdgesState(edges)

    return (
        <div style={{ width: '100%', height: '100vh' }}>
            <ReactFlow
                nodes={nds}
                edges={eds}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                nodeTypes={nodeTypes}
                fitView
                fitViewOptions={{ padding: 0.25 }}
                proOptions={{ hideAttribution: true }}
            >
                <Controls
                    className="!bg-white/80 !backdrop-blur-sm !border !border-gray-200 !rounded-lg !shadow-lg"
                />
                <MiniMap
                    nodeColor={(node: any) => {
                        const score = node.data?.score ?? 100
                        if (score >= 90) return '#22c55e'
                        if (score >= 50) return '#f59e0b'
                        return '#ef4444'
                    }}
                    maskColor="rgba(0,0,0,0.08)"
                    className="!rounded-lg !border !border-gray-200 !shadow-lg"
                />
                <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="#e2e8f0" />
            </ReactFlow>
        </div>
    )
}
