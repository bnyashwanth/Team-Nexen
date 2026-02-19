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
    onNodeClick?: (data: any) => void
}

interface MetricTreeProps {
    data: MetricSnapshot[]
    onNodeSelect: (data: any) => void
    selectedWarehouse: string
}

// ---- Metric Hierarchy (matches the 8-metric tree from PS) ----
const METRIC_HIERARCHY: Record<string, string[]> = {
    'poi': ['otd', 'oa', 'dfr'],
    'otd': ['wpt', 'tt'],
    'wpt': ['pick', 'label', 'pack'],
    'oa': [],
    'dfr': [],
    'tt': [],
    'pick': [],
    'label': [],
    'pack': []
}

// Friendly display names
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

// Count total leaf-width of a subtree (for centering)
function subtreeWidth(metricId: string): number {
    const children = getChildren(metricId)
    if (children.length === 0) return 1
    return children.reduce((sum, c) => sum + subtreeWidth(c), 0)
}

// ---- Custom Node Component ----
function MetricNode({ data }: { data: MetricNodeData }) {
    const isAnomaly = data.status === 'critical' || data.status === 'warn'

    const handleClick = () => {
        if (data.onNodeClick) {
            data.onNodeClick({
                metric: data.metricId,
                metricId: data.metricId,
                score: data.score,
                warehouse_id: data.warehouseId,
                warehouseId: data.warehouseId,
                status: data.status,
                avgTime: data.avgTime,
                target: data.target,
                errorCode: data.errorCode,
                affectedZone: data.affectedZone,
                impactWeight: data.impactWeight
            })
        }
    }

    const borderColor = data.status === 'critical' ? 'border-red-500' :
        data.status === 'warn' ? 'border-yellow-500' : 'border-green-500'

    const bgColor = data.status === 'critical' ? 'bg-red-50' :
        data.status === 'warn' ? 'bg-yellow-50' : 'bg-green-50'

    const statusDot = data.status === 'critical' ? '🔴' :
        data.status === 'warn' ? '🟡' : '🟢'

    return (
        <div
            className={`px-4 py-3 shadow-md rounded-lg ${bgColor} border-2 ${borderColor} cursor-pointer hover:shadow-lg transition-all duration-200 min-w-[160px] relative`}
            onClick={handleClick}
        >
            <Handle type="target" position={Position.Top} className="!bg-gray-400 !w-2 !h-2" />
            <div className="font-bold text-sm text-gray-900 mb-1">{data.label}</div>
            <div className={`text-lg font-semibold ${data.status === 'critical' ? 'text-red-600' :
                data.status === 'warn' ? 'text-yellow-600' : 'text-green-600'
                }`}>
                {statusDot} {data.score?.toFixed(1)}%
            </div>
            {data.impactWeight && (
                <div className="text-xs text-gray-500 mt-1">
                    weight: {(data.impactWeight * 100).toFixed(0)}%
                </div>
            )}
            {data.avgTime && (
                <div className="text-xs text-orange-600 font-medium mt-1">
                    ⏱ {data.avgTime}
                </div>
            )}
            {data.errorCode && (
                <div className="text-xs text-red-600 font-semibold mt-1">
                    ⚠️ {data.errorCode}
                </div>
            )}
            {data.affectedZone && (
                <div className="text-xs text-gray-500">
                    Zone: {data.affectedZone}
                </div>
            )}
            <Handle type="source" position={Position.Bottom} className="!bg-gray-400 !w-2 !h-2" />
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

        // Find the snapshot for selected warehouse
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
        const nodeIdMap: Record<string, string> = {} // metricId -> nodeId

        const NODE_WIDTH = 180
        const NODE_HEIGHT = 120
        const H_GAP = 30
        const V_GAP = 100

        // Recursive layout: center parent above children
        let nodeCounter = 0

        const layoutNode = (metricId: string, level: number, leftX: number): { x: number; width: number } => {
            const children = getChildren(metricId).filter(c => metricTree[c])
            const metricData = metricTree[metricId]
            const nodeId = `node-${nodeCounter++}`
            nodeIdMap[metricId] = nodeId

            if (children.length === 0) {
                // Leaf node
                const x = leftX
                nodes.push({
                    id: nodeId,
                    type: 'metricNode',
                    position: { x, y: level * (NODE_HEIGHT + V_GAP) },
                    data: {
                        label: metricData?.name || METRIC_NAMES[metricId] || metricId.toUpperCase(),
                        score: metricData?.score ?? 0,
                        status: metricData?.status || 'healthy',
                        metricId,
                        warehouseId: selectedWarehouse,
                        avgTime: metricData?.avgTime,
                        target: metricData?.target,
                        errorCode: metricData?.errorCode,
                        affectedZone: metricData?.affectedZone,
                        impactWeight: metricData?.impactWeight,
                        onNodeClick: onNodeSelect
                    }
                })
                return { x, width: NODE_WIDTH }
            }

            // layout children first
            let currentX = leftX
            const childPositions: { x: number; width: number }[] = []
            for (const childId of children) {
                const pos = layoutNode(childId, level + 1, currentX)
                childPositions.push(pos)
                currentX = pos.x + pos.width + H_GAP

                // Add edge from parent to child
                edges.push({
                    id: `edge-${metricId}-${childId}`,
                    source: nodeId,
                    target: nodeIdMap[childId],
                    type: 'smoothstep',
                    animated: metricData?.status === 'critical',
                    style: {
                        stroke: metricData?.status === 'critical' ? '#ef4444' :
                            metricData?.status === 'warn' ? '#f59e0b' : '#10b981',
                        strokeWidth: 2
                    }
                })
            }

            // Center parent above children
            const leftmost = childPositions[0].x
            const rightmostEnd = childPositions[childPositions.length - 1].x + childPositions[childPositions.length - 1].width
            const totalChildrenWidth = rightmostEnd - leftmost
            const parentX = leftmost + (totalChildrenWidth - NODE_WIDTH) / 2

            nodes.push({
                id: nodeId,
                type: 'metricNode',
                position: { x: parentX, y: level * (NODE_HEIGHT + V_GAP) },
                data: {
                    label: metricData?.name || METRIC_NAMES[metricId] || metricId.toUpperCase(),
                    score: metricData?.score ?? 0,
                    status: metricData?.status || 'healthy',
                    metricId,
                    warehouseId: selectedWarehouse,
                    avgTime: metricData?.avgTime,
                    target: metricData?.target,
                    errorCode: metricData?.errorCode,
                    affectedZone: metricData?.affectedZone,
                    impactWeight: metricData?.impactWeight,
                    onNodeClick: onNodeSelect
                }
            })

            return { x: leftmost, width: totalChildrenWidth }
        }

        // Start with root node (POI)
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
                    <div className="text-sm mt-1">Go to Admin Portal → Click "Generate Demo Data" to populate the tree</div>
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
                fitViewOptions={{ padding: 0.2 }}
            >
                <Controls />
                <MiniMap
                    nodeColor={(node: any) => {
                        const status = node.data?.status
                        if (status === 'critical') return '#ef4444'
                        if (status === 'warn') return '#f59e0b'
                        return '#10b981'
                    }}
                />
                <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
            </ReactFlow>
        </div>
    )
}
