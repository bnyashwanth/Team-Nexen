import { NextResponse, type NextRequest } from 'next/server'
import { apiClient } from '@/lib/api'

const ML_ENGINE_URL = process.env.ML_ENGINE_URL || 'http://localhost:5001'

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { warehouse_id, metric_id, score, orders_volume, staff_count } = body

        if (!warehouse_id || !metric_id || score === undefined || !orders_volume || !staff_count) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            )
        }

        // Calculate time-based fields
        const now = new Date()
        const hour_of_day = now.getHours()
        const day_of_week = now.getDay()

        // Call ML engine for anomaly detection
        let mlResult = { is_anomaly: false, confidence_score: 0.5, z_score: 0 }

        try {
            const mlResponse = await fetch(`${ML_ENGINE_URL}/api/analyze`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    score,
                    rolling_avg_7d: score, // Default fallback
                    hour_of_day,
                    orders_volume,
                    staff_count,
                    warehouse_id,
                    metric_id,
                    day_of_week
                })
            })

            if (mlResponse.ok) {
                mlResult = await mlResponse.json()
            } else {
                console.warn('ML Engine returned non-OK status, using defaults')
            }
        } catch (mlError) {
            console.warn('ML Engine unreachable, using default values:', mlError)
        }

        // Forward to backend ingest endpoint
        const backendResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/ingest`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                warehouse_id,
                metric_id,
                score,
                orders_volume,
                staff_count
            })
        })

        const backendResult = await backendResponse.json()

        return NextResponse.json({
            success: true,
            data: backendResult.data,
            ml_analysis: mlResult
        })

    } catch (error) {
        console.error('Error in ingest API:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
