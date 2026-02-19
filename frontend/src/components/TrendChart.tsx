'use client'

import { useState, useEffect } from 'react'
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    ReferenceLine,
} from 'recharts'
import { apiClient, type TrendData } from '@/lib/api'

interface TrendChartProps {
    metricId: string
    warehouseId: string
    days?: number
}

export default function TrendChart({ metricId, warehouseId, days = 7 }: TrendChartProps) {
    const [trendData, setTrendData] = useState<TrendData[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (!metricId || !warehouseId) return

        const fetchTrend = async () => {
            setIsLoading(true)
            setError(null)

            try {
                const result = await apiClient.getTrend(metricId, warehouseId, days)
                if (result.data?.data) {
                    setTrendData(result.data.data)
                } else if (result.error) {
                    setError(result.error)
                }
            } catch (err) {
                setError('Failed to load trend data')
            } finally {
                setIsLoading(false)
            }
        }

        fetchTrend()
    }, [metricId, warehouseId, days])

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-48 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-500">Loading trend data...</div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="flex items-center justify-center h-48 bg-red-50 rounded-lg">
                <div className="text-sm text-red-500">{error}</div>
            </div>
        )
    }

    if (trendData.length === 0) {
        return (
            <div className="flex items-center justify-center h-48 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-500">No trend data available</div>
            </div>
        )
    }

    // Calculate thresholds for reference lines
    const avgScore = trendData.reduce((sum, d) => sum + d.score, 0) / trendData.length

    return (
        <div className="bg-white p-4 rounded-lg border border-gray-200">
            <h3 className="text-sm font-medium text-gray-700 mb-2">
                {metricId.toUpperCase()} Score Trend — {days} Days
            </h3>
            <ResponsiveContainer width="100%" height={200}>
                <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis
                        dataKey="date"
                        tick={{ fontSize: 10 }}
                        tickFormatter={(value: string) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                    <Tooltip
                        formatter={(value: any) => [`${Number(value).toFixed(2)}%`, 'Score']}
                        labelFormatter={(label: any) => new Date(label).toLocaleDateString()}
                    />
                    <ReferenceLine y={80} stroke="#10b981" strokeDasharray="3 3" label={{ value: 'Healthy', position: 'right', fontSize: 10 }} />
                    <ReferenceLine y={60} stroke="#f59e0b" strokeDasharray="3 3" label={{ value: 'Warn', position: 'right', fontSize: 10 }} />
                    <ReferenceLine y={avgScore} stroke="#6366f1" strokeDasharray="5 5" label={{ value: 'Avg', position: 'right', fontSize: 10 }} />
                    <Line
                        type="monotone"
                        dataKey="score"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        dot={{ r: 3 }}
                        activeDot={{ r: 5 }}
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    )
}
