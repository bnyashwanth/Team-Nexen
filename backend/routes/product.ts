import express, { Request, Response } from 'express'
import { supabase } from '../lib/supabase'

const router = express.Router()

// GET /api/product/:sku/tree - Get metric tree for a specific product SKU
// Simulates aggregated performance data for a product type
router.get('/:sku/tree', async (req: Request, res: Response) => {
    const { sku } = req.params

    // Simulate deterministic data based on SKU hash
    const hash = sku.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
    const seed = (hash % 100) / 100 // 0.0 to 1.0

    // Base scores modified by seed
    // Some products are "problematic" (low scores), others are good
    const isProblematic = seed < 0.3
    const baseScore = isProblematic ? 60 + (seed * 20) : 90 + (seed * 10)

    // Generate tree
    const rootScore = parseFloat(baseScore.toFixed(2))
    const rootStatus = rootScore < 70 ? 'critical' : rootScore < 85 ? 'warn' : 'healthy'

    const tree = {
        poi: { score: rootScore, status: rootStatus, name: 'Perfect Order Index' },
        otd: { score: Math.min(100, rootScore + 5), status: rootStatus, name: 'On-Time Delivery', impactWeight: 0.60 },
        oa: { score: Math.min(100, rootScore + 2), status: rootStatus, name: 'Order Accuracy', impactWeight: 0.25 },
        dfr: { score: Math.min(100, rootScore + 8), status: 'healthy', name: 'Damage Free Rate', impactWeight: 0.15 },
        wpt: { score: Math.max(0, rootScore - 10), status: rootStatus, name: 'Warehouse Processing', impactWeight: 0.55 },
        tt: { score: Math.min(100, rootScore + 10), status: 'healthy', name: 'Transit Time', impactWeight: 0.45 },
        pick: { score: Math.min(100, rootScore + 5), status: 'healthy', name: 'Picking Time', impactWeight: 0.30 },
        pack: { score: Math.min(100, rootScore + 2), status: 'healthy', name: 'Packing Speed', impactWeight: 0.30 },
        label: {
            score: Math.max(0, rootScore - 15),
            status: isProblematic ? 'critical' : 'warn',
            name: 'Label Generation',
            impactWeight: 0.40,
            ...(isProblematic ? { errorCode: 'SKU_MISMATCH', affectedZone: 'Dispatch' } : {})
        }
    }

    // Simulate a delay
    await new Promise(r => setTimeout(r, 600))

    res.json({
        sku: sku.toUpperCase(),
        productName: `Product ${sku.toUpperCase()}`,
        tree
    })
})

export default router
