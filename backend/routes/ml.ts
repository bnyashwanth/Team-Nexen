import { Router, Request, Response } from 'express'

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

export default router
