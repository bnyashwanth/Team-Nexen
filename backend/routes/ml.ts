import { Router, Request, Response } from 'express'
import { supabase } from '../lib/supabase'

const router = Router()

const ML_ENGINE_URL = process.env.ML_ENGINE_URL || 'http://localhost:5001'

/**
 * Helper to proxy requests to the ML Flask API
 */
async function proxyToML(endpoint: string, body: any): Promise<any> {
    const response = await fetch(`${ML_ENGINE_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    })

    if (!response.ok) {
        const errorBody = await response.json().catch(() => ({ error: 'ML Engine error' })) as Record<string, unknown>
        const err: Record<string, unknown> = { status: response.status, ...errorBody }
        throw err
    }

    return response.json()
}

/**
 * GET /api/ml/health
 * Check ML engine health and model status
 */
router.get('/health', async (req: Request, res: Response) => {
    try {
        const response = await fetch(`${ML_ENGINE_URL}/api/health`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
        })

        if (!response.ok) {
            return res.status(503).json({
                status: 'unreachable',
                error: 'ML Engine is not responding',
                ml_engine_url: ML_ENGINE_URL,
            })
        }

        const healthData = await response.json() as Record<string, unknown>
        res.json({
            ...healthData,
            status: 'connected',
            ml_engine_url: ML_ENGINE_URL,
        })
    } catch (error: any) {
        res.status(503).json({
            status: 'unreachable',
            error: error.message || 'ML Engine is not running',
            ml_engine_url: ML_ENGINE_URL,
        })
    }
})

/**
 * POST /api/ml/analyze
 * Anomaly detection + Z-score prediction
 */
router.post('/analyze', async (req: Request, res: Response) => {
    try {
        const result = await proxyToML('/api/analyze', req.body)
        res.json(result)
    } catch (error: any) {
        const status = error.status || 503
        res.status(status).json({
            error: error.error || 'ML Engine analysis failed',
            fallback: true,
        })
    }
})

/**
 * POST /api/ml/root-cause
 * Root cause classification
 */
router.post('/root-cause', async (req: Request, res: Response) => {
    try {
        const result = await proxyToML('/api/root-cause', req.body)
        res.json(result)
    } catch (error: any) {
        const status = error.status || 503
        res.status(status).json({
            error: error.error || 'ML Engine root cause analysis failed',
            fallback: true,
        })
    }
})

/**
 * POST /api/ml/predict/:model
 * Score predictions (poi, poi-actual, wpt, otd)
 */
router.post('/predict/:model', async (req: Request, res: Response) => {
    const model = req.params.model
    const validModels = ['poi', 'poi-actual', 'wpt', 'otd']

    if (!validModels.includes(model)) {
        return res.status(400).json({
            error: `Invalid model: ${model}. Valid models: ${validModels.join(', ')}`,
        })
    }

    try {
        const result = await proxyToML(`/api/predict/${model}`, req.body)
        res.json(result)
    } catch (error: any) {
        const status = error.status || 503
        res.status(status).json({
            error: error.error || `ML Engine ${model} prediction failed`,
            fallback: true,
        })
    }
})

/**
 * POST /api/ml/sync
 * Run ALL ML predictions using the latest snapshot's sub-metrics,
 * then create a new complete snapshot with ML-predicted scores.
 * 
 * Body: { warehouse_id: string }
 */
router.post('/sync', async (req: Request, res: Response) => {
    try {
        const { warehouse_id } = req.body

        if (!warehouse_id) {
            return res.status(400).json({ error: 'warehouse_id is required' })
        }

        // 1. Get the latest snapshot for this warehouse that has a FULL metric tree
        const { data: snapshots, error: snapError } = await supabase
            .from('metric_snapshots')
            .select('*')
            .eq('warehouse_id', warehouse_id)
            .order('timestamp', { ascending: false })
            .limit(20)

        if (snapError) {
            return res.status(500).json({ error: 'Failed to fetch snapshots' })
        }

        // Find the best snapshot that has the most metrics (prefer full-tree seed data)
        let bestSnapshot: any = null
        let bestMetricCount = 0
        for (const snap of (snapshots || [])) {
            const tree = snap.metric_tree
            if (tree && typeof tree === 'object') {
                const metricCount = Object.keys(tree).filter(k => {
                    const v = tree[k]
                    return v && typeof v === 'object' && 'score' in v
                }).length
                if (metricCount > bestMetricCount) {
                    bestMetricCount = metricCount
                    bestSnapshot = snap
                }
            }
        }

        if (!bestSnapshot || bestMetricCount < 3) {
            return res.status(404).json({
                error: 'No suitable snapshot found with enough metrics to run predictions'
            })
        }

        const tree = bestSnapshot.metric_tree

        // 2. Extract current sub-metric scores from the best snapshot
        const label_score = tree.label?.score ?? 80
        const pick_score = tree.pick?.score ?? 85
        const pack_score = tree.pack?.score ?? 85
        const tt_score = tree.tt?.score ?? 90
        const oa_score = tree.oa?.score ?? 95
        const dfr_score = tree.dfr?.score ?? 97

        // 3. Run ML predictions in parallel
        const [wptResult, otdResult, poiActualResult] = await Promise.allSettled([
            proxyToML('/api/predict/wpt', { label_score, pick_score, pack_score }),
            proxyToML('/api/predict/otd', { label_score, pick_score, pack_score, wpt_score_actual: tree.wpt?.score ?? 75, tt_score }),
            proxyToML('/api/predict/poi-actual', { label_score, pick_score, pack_score, wpt_score_actual: tree.wpt?.score ?? 75, tt_score }),
        ])

        const predictedWpt = wptResult.status === 'fulfilled' ? wptResult.value.wpt_score : tree.wpt?.score ?? 0
        const predictedOtd = otdResult.status === 'fulfilled' ? otdResult.value.otd_score : tree.otd?.score ?? 0
        const predictedPoiActual = poiActualResult.status === 'fulfilled' ? poiActualResult.value.poi_actual_score : tree.poi?.score ?? 0

        // 4. Determine statuses
        const getStatus = (score: number) => score >= 80 ? 'healthy' : score >= 60 ? 'warn' : 'critical'

        // 5. Build the complete updated metric tree
        const newMetricTree: Record<string, any> = {
            poi: {
                score: parseFloat(predictedPoiActual.toFixed(2)),
                status: getStatus(predictedPoiActual),
                name: 'Perfect Order Index',
            },
            otd: {
                score: parseFloat(predictedOtd.toFixed(2)),
                status: getStatus(predictedOtd),
                name: 'On-Time Delivery',
                impactWeight: 0.60,
            },
            oa: {
                score: oa_score,
                status: getStatus(oa_score),
                name: 'Order Accuracy',
                impactWeight: 0.25,
            },
            dfr: {
                score: dfr_score,
                status: getStatus(dfr_score),
                name: 'Damage Free Rate',
                impactWeight: 0.15,
            },
            wpt: {
                score: parseFloat(predictedWpt.toFixed(2)),
                status: getStatus(predictedWpt),
                name: 'Warehouse Processing',
                impactWeight: 0.55,
            },
            tt: {
                score: tt_score,
                status: getStatus(tt_score),
                name: 'Transit Time',
                impactWeight: 0.45,
            },
            pick: {
                score: pick_score,
                status: getStatus(pick_score),
                name: 'Picking Time',
                impactWeight: 0.30,
            },
            pack: {
                score: pack_score,
                status: getStatus(pack_score),
                name: 'Packing Speed',
                impactWeight: 0.30,
            },
            label: {
                score: label_score,
                status: getStatus(label_score),
                name: 'Label Generation',
                impactWeight: 0.40,
            },
        }

        const rootScore = parseFloat(predictedPoiActual.toFixed(2))
        const rootStatus = getStatus(rootScore)

        // 6. Insert new snapshot with ML-predicted values
        const { data: newSnapshot, error: insertError } = await supabase
            .from('metric_snapshots')
            .insert({
                warehouse_id,
                timestamp: new Date().toISOString(),
                root_score: rootScore,
                root_status: rootStatus,
                metric_tree: newMetricTree,
            })
            .select()
            .single()

        if (insertError) {
            console.error('ML sync insert error:', insertError)
            return res.status(500).json({ error: 'Failed to save ML-predicted snapshot' })
        }

        res.json({
            message: 'ML predictions synced to dashboard successfully',
            snapshot: {
                id: newSnapshot.id,
                warehouse_id,
                timestamp: newSnapshot.timestamp,
                rootScore,
                rootStatus,
            },
            predictions: {
                poi: predictedPoiActual,
                wpt: predictedWpt,
                otd: predictedOtd,
                oa: oa_score,
                dfr: dfr_score,
                tt: tt_score,
                pick: pick_score,
                pack: pack_score,
                label: label_score,
            },
            modelsUsed: {
                wpt: wptResult.status === 'fulfilled',
                otd: otdResult.status === 'fulfilled',
                poiActual: poiActualResult.status === 'fulfilled',
            }
        })

    } catch (error: any) {
        console.error('ML sync error:', error)
        res.status(500).json({ error: error.message || 'ML sync failed' })
    }
})

export default router
