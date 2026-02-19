'use client'

import { Handle, Position } from 'reactflow'
import { ArrowUpRight, ArrowDownRight, Minus, TriangleAlert } from 'lucide-react'

export interface CustomMetricNodeData {
    label: string
    score: number
    weight: number
    trend: 'up' | 'down' | 'flat'
    errorLog?: string
}

export default function CustomMetricNode({ data }: { data: CustomMetricNodeData }) {
    const { label, score, weight, trend, errorLog } = data

    // ── Threshold colors ──
    const isGreen = score >= 90
    const isAmber = score >= 50 && score < 90
    const isRed = score < 50

    const borderClass = isGreen
        ? 'border-green-500'
        : isAmber
            ? 'border-amber-500'
            : 'border-red-500'

    const textClass = isGreen
        ? 'text-green-700'
        : isAmber
            ? 'text-amber-700'
            : 'text-red-700'

    const bgClass = isRed ? 'bg-red-50' : 'bg-white'

    // ── Trend icon ──
    const TrendIcon =
        trend === 'up'
            ? ArrowUpRight
            : trend === 'down'
                ? ArrowDownRight
                : Minus

    const trendColor =
        trend === 'up'
            ? 'text-green-500'
            : trend === 'down'
                ? 'text-red-500'
                : 'text-gray-400'

    // ── Error badge visibility ──
    const showError = !!errorLog && isRed

    return (
        <div
            className={`
        ${bgClass} ${borderClass} border-2 rounded-xl shadow-md
        px-4 py-3 min-w-[180px] max-w-[220px]
        hover:shadow-xl transition-all duration-200
      `}
        >
            {/* React Flow handles */}
            <Handle
                type="target"
                position={Position.Top}
                className="!bg-gray-300 !w-2 !h-2 !border-none"
            />

            {/* Top row — label */}
            <div className="text-sm font-semibold text-gray-800 leading-tight mb-1.5">
                {label}
            </div>

            {/* Middle row — score + trend */}
            <div className="flex items-center gap-1.5 mb-1">
                <span className={`text-xl font-bold ${textClass}`}>
                    {score.toFixed(1)}%
                </span>
                <TrendIcon className={`w-4 h-4 ${trendColor}`} strokeWidth={2.5} />
            </div>

            {/* Bottom row — AI weight */}
            <div className="text-[11px] text-gray-400 font-medium">
                ✨ AI Weight: {weight}%
            </div>

            {/* ML Context Badge — only when errorLog exists AND score is critical */}
            {showError && (
                <div className="mt-2 flex items-center gap-1 bg-red-500 text-white text-[10px] font-semibold rounded-full px-2.5 py-0.5 w-fit">
                    <TriangleAlert className="w-3 h-3 flex-shrink-0" />
                    <span className="truncate max-w-[140px]">{errorLog}</span>
                </div>
            )}

            <Handle
                type="source"
                position={Position.Bottom}
                className="!bg-gray-300 !w-2 !h-2 !border-none"
            />
        </div>
    )
}
