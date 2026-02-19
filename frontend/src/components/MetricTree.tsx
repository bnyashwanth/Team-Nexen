'use client'

import { useCallback, useMemo } from 'react'
import ReactFlow, {
    MiniMap,
    Controls,
    Background,
    BackgroundVariant,
    useNodesState,
    useEdgesState,
    addEdge,
    Handle,
    Position,
    type Node,
    type Edge,
    type OnConnect,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { ArrowUpRight, ArrowDownRight, Minus, TriangleAlert } from 'lucide-react'
import type { MetricSnapshot } from '@/lib/api'

// ---- Types ----
interface MetricNodeData {
    label: string
    score: number
    status: 'healthy' | 'warn' | 'critical'
    metricId: string
    warehouseId: string
    avgTime?: string
    target?: string
    errorCode?: string
    affectedZone?: string
    impactWeight?: number
    trend?: 'up' | 'down' | 'flat'
    onNodeClick?: (data: any) => void
}

interface MetricTreeProps {
    data: MetricSnapshot[]
    onNodeSelect: (data: any) => void
    selectedWarehouse: string
}

// ---- Metric Hierarchy ----
const METRIC_HIERARCHY: Record<string, string[]> = {
    'poi': ['otd', 'oa', 'dfr'],
    'otd': ['wpt', 'tt'],
    'wpt': ['pick', 'label', 'pack'],
    'oa': [], 'dfr': [], 'tt': [],
    'pick': [], 'label': [], 'pack': []
}

const METRIC_NAMES: Record<string, string> = {
    poi: 'Perfect Order Index',
    otd: 'On-Time Delivery',
    oa: 'Order Accuracy',
    dfr: 'Damage Free Rate',
    wpt: 'Warehouse Processing',
    tt: 'Transit Time',
    pick: 'Picking Time',
    label: 'Label Generation',
    pack: 'Packing Speed'
}

function getChildren(metricId: string): string[] {
    return METRIC_HIERARCHY[metricId] || []
}

// ---- Custom Node ----
function MetricNode({ data }: { data: MetricNodeData }) {
    const { label, score, impactWeight, errorCode, trend, status } = data

    // ── Score-based thresholds ──
    const isGreen = score >= 90
    const isAmber = score >= 50 && score < 90
    const isRed = score < 50

    // ── Trend: prefer explicit, then derive from status ──
    const effectiveTrend = trend
        || (status === 'healthy' ? 'up' : status === 'critical' ? 'down' : 'flat')

    const TrendIcon = effectiveTrend === 'up' ? ArrowUpRight
        : effectiveTrend === 'down' ? ArrowDownRight
            : Minus

    const trendColor = effectiveTrend === 'up' ? 'text-emerald-500'
        : effectiveTrend === 'down' ? 'text-red-500'
            : 'text-slate-400'

    // ── Weight (0-1 → %) ──
    const weightPct = impactWeight !== undefined
        ? (impactWeight <= 1 ? Math.round(impactWeight * 100) : Math.round(impactWeight))
        : null

    // ── Error badge ──
    const showError = !!errorCode && isRed

    const handleClick = () => {
        if (data.onNodeClick) {
            data.onNodeClick({
                metric: data.metricId, metricId: data.metricId,
                score, warehouse_id: data.warehouseId, warehouseId: data.warehouseId,
                status, avgTime: data.avgTime, target: data.target,
                errorCode, affectedZone: data.affectedZone, impactWeight
            })
        }
    }

    return (
        <div
            onClick={handleClick}
            style={{
                background: isRed ? '#fef2f2' : '#ffffff',
                border: `2px solid ${isGreen ? '#22c55e' : isAmber ? '#f59e0b' : '#ef4444'}`,
                borderRadius: 14,
                padding: '14px 18px',
                minWidth: 190,
                maxWidth: 230,
                cursor: 'pointer',
                boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
                transition: 'box-shadow 0.2s, transform 0.2s',
                fontFamily: 'Inter, system-ui, sans-serif',
            }}
            onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = '0 6px 24px rgba(0,0,0,0.15)'
                e.currentTarget.style.transform = 'translateY(-2px)'
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.08)'
                e.currentTarget.style.transform = 'translateY(0)'
            }}
        >
            <Handle type="target" position={Position.Top}
                style={{ background: '#94a3b8', width: 8, height: 8, border: 'none' }} />

            {/* Label */}
            <div style={{ fontSize: 13, fontWeight: 600, color: '#1e293b', marginBottom: 6, lineHeight: 1.3 }}>
                {label}
            </div>

            {/* Score + Trend */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <span style={{
                    fontSize: 22, fontWeight: 700,
                    color: isGreen ? '#15803d' : isAmber ? '#b45309' : '#dc2626'
                }}>
                    {score?.toFixed(1)}%
                </span>
                <TrendIcon
                    size={18}
                    strokeWidth={2.5}
                    color={effectiveTrend === 'up' ? '#22c55e' : effectiveTrend === 'down' ? '#ef4444' : '#94a3b8'}
                />
            </div>

            {/* AI Weight */}
            {weightPct !== null && (
                <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 500 }}>
                    ✨ AI Weight: {weightPct}%
                </div>
            )}

            {/* Avg Time */}
            {data.avgTime && (
                <div style={{ fontSize: 11, color: '#ea580c', fontWeight: 600, marginTop: 4 }}>
                    ⏱ Avg: {data.avgTime}
                </div>
            )}

            {/* ML Context Error Badge */}
            {showError && (
                <div style={{
                    marginTop: 8,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    background: '#ef4444',
                    color: '#ffffff',
                    fontSize: 10,
                    fontWeight: 700,
                    borderRadius: 999,
                    padding: '3px 10px',
                }}>
                    <TriangleAlert size={12} />
                    <span>{errorCode}</span>
                </div>
            )}

            {/* Affected Zone */}
            {data.affectedZone && (
                <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 3 }}>
                    📍 Zone: {data.affectedZone}
                </div>
            )}

            <Handle type="source" position={Position.Bottom}
                style={{ background: '#94a3b8', width: 8, height: 8, border: 'none' }} />
        </div>
    )
}

const nodeTypes = {
    metricNode: MetricNode,
}

// ---- Main Component ----
export default function MetricTree({ data, onNodeSelect, selectedWarehouse }: MetricTreeProps) {
    const { nodes: initialNodes, edges: initialEdges } = useMemo(() => {
        if (!data || data.length === 0) {
            return { nodes: [] as Node[], edges: [] as Edge[] }
        }

        const warehouseSnapshot = data.find(snapshot =>
            snapshot.warehouseId === selectedWarehouse ||
            (snapshot as any).warehouse_id === selectedWarehouse
        )
        if (!warehouseSnapshot || !warehouseSnapshot.metricTree) {
            return { nodes: [] as Node[], edges: [] as Edge[] }
        }

        const metricTree = warehouseSnapshot.metricTree
        const nodes: Node[] = []
        const edges: Edge[] = []
        const nodeIdMap: Record<string, string> = {}
        const nodeDataMap: Record<string, any> = {}

        const NODE_WIDTH = 210
        const NODE_HEIGHT = 140
        const H_GAP = 45
        const V_GAP = 110

        let nodeCounter = 0

        const layoutNode = (metricId: string, level: number, leftX: number): { x: number; width: number } => {
            const children = getChildren(metricId).filter(c => metricTree[c])
            const metricData = metricTree[metricId]
            const nodeId = `node-${nodeCounter++}`
            nodeIdMap[metricId] = nodeId
            nodeDataMap[metricId] = metricData

            const nodePayload = {
                label: metricData?.name || METRIC_NAMES[metricId] || metricId.toUpperCase(),
                score: metricData?.score ?? 0,
                status: metricData?.status || 'healthy',
                metricId,
                warehouseId: selectedWarehouse,
                avgTime: metricData?.avgTime,
                target: metricData?.target,
                errorCode: metricData?.errorCode,
                affectedZone: metricData?.affectedZone,
                impactWeight: metricData?.impactWeight ?? (metricId === 'poi' ? 1.0 : undefined),
                trend: metricData?.trend,
                onNodeClick: onNodeSelect,
            }

            if (children.length === 0) {
                const x = leftX
                nodes.push({
                    id: nodeId,
                    type: 'metricNode',
                    position: { x, y: level * (NODE_HEIGHT + V_GAP) },
                    data: nodePayload,
                })
                return { x, width: NODE_WIDTH }
            }

            let currentX = leftX
            const childPositions: { x: number; width: number }[] = []
            for (const childId of children) {
                const pos = layoutNode(childId, level + 1, currentX)
                childPositions.push(pos)
                currentX = pos.x + pos.width + H_GAP
            }

            // Edges with critical-bottleneck logic
            for (const childId of children) {
                const childData = nodeDataMap[childId]
                const childScore = childData?.score ?? 100
                const rawWeight = childData?.impactWeight ?? 0
                const childWeightPct = rawWeight <= 1 ? rawWeight * 100 : rawWeight
                const isCritical = childScore < 50 && childWeightPct >= 30

                edges.push({
                    id: `edge-${metricId}-${childId}`,
                    source: nodeId,
                    target: nodeIdMap[childId],
                    type: 'smoothstep',
                    animated: isCritical,
                    style: {
                        stroke: isCritical ? '#ef4444' : '#cbd5e1',
                        strokeWidth: isCritical ? 3 : 1.5,
                    },
                })
            }

            const leftmost = childPositions[0].x
            const rightmostEnd = childPositions[childPositions.length - 1].x + childPositions[childPositions.length - 1].width
            const totalChildrenWidth = rightmostEnd - leftmost
            const parentX = leftmost + (totalChildrenWidth - NODE_WIDTH) / 2

            nodes.push({
                id: nodeId,
                type: 'metricNode',
                position: { x: parentX, y: level * (NODE_HEIGHT + V_GAP) },
                data: nodePayload,
            })

            return { x: leftmost, width: totalChildrenWidth }
        }

        if (metricTree.poi) {
            layoutNode('poi', 0, 0)
        }

        return { nodes, edges }
    }, [data, selectedWarehouse, onNodeSelect])

    const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)

    const onConnect: OnConnect = useCallback(
        (params) => setEdges((eds) => addEdge(params, eds)),
        [setEdges]
    )

    if (!data || data.length === 0) {
        return (
            <div className="flex items-center justify-center h-96 text-gray-500">
                <div className="text-center">
                    <div className="text-4xl mb-3">📊</div>
                    <div className="text-lg font-medium">No metrics data available</div>
                    <div className="text-sm mt-1">Go to Admin Portal → Click &ldquo;Generate Demo Data&rdquo; to populate the tree</div>
                </div>
            </div>
        )
    }

    return (
        <div style={{ width: '100%', height: '700px' }}>
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                nodeTypes={nodeTypes}
                fitView
                fitViewOptions={{ padding: 0.25 }}
            >
                <Controls />
                <MiniMap
                    nodeColor={(node: any) => {
                        const s = node.data?.score ?? 100
                        if (s >= 90) return '#22c55e'
                        if (s >= 50) return '#f59e0b'
                        return '#ef4444'
                    }}
                />
                <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
            </ReactFlow>
        </div>
    )
}
