import express, { Request, Response } from 'express'
import { supabase } from '../lib/supabase'

const router = express.Router()

// Helper function to enrich metric tree with definitions
function enrichMetricTree(tree: any, metricMap: Map<string, any>): any {
  if (!tree || typeof tree !== 'object') return tree

  const enriched: any = {}
  for (const [key, value] of Object.entries(tree)) {
    enriched[key] = value
    if (metricMap.has(key)) {
      enriched._definition = metricMap.get(key)
    }
  }
  return enriched
}

// GET /api/tree - Get latest metric tree for all warehouses
router.get('/', async (req: Request, res: Response) => {
  try {
    const { warehouseId } = req.query

    // Get warehouses for filter dropdown
    const { data: warehouses, error: whError } = await supabase
      .from('warehouses')
      .select('*')
      .eq('is_active', true)
      .order('id', { ascending: true })

    if (whError) {
      console.error('Warehouses query error:', whError)
      return res.status(500).json({ error: 'Failed to fetch warehouses' })
    }

    // Get latest snapshot per warehouse using a subquery approach
    // Supabase doesn't have MongoDB-style aggregation, so we get all and deduplicate
    let snapshotQuery = supabase
      .from('metric_snapshots')
      .select('*')
      .order('timestamp', { ascending: false })

    if (warehouseId) {
      snapshotQuery = snapshotQuery.eq('warehouse_id', warehouseId as string)
    }

    const { data: allSnapshots, error: snapError } = await snapshotQuery

    if (snapError) {
      console.error('Snapshots query error:', snapError)
      return res.status(500).json({ error: 'Failed to fetch snapshots' })
    }

    // Deduplicate: keep only the latest snapshot per warehouse
    const latestByWarehouse = new Map<string, any>()
    for (const snapshot of allSnapshots || []) {
      if (!latestByWarehouse.has(snapshot.warehouse_id)) {
        latestByWarehouse.set(snapshot.warehouse_id, snapshot)
      }
    }
    const snapshots = Array.from(latestByWarehouse.values())

    // Get metric definitions
    const { data: metricDefs } = await supabase
      .from('metric_definitions')
      .select('*')

    const metricMap = new Map()
      ; (metricDefs || []).forEach((def: any) => {
        metricMap.set(def.metric_id, def)
      })

    // Enrich snapshots with metric definitions
    const enrichedSnapshots = snapshots.map((snapshot: any) => ({
      ...snapshot,
      // Map Supabase snake_case to camelCase for frontend compatibility
      warehouseId: snapshot.warehouse_id,
      metricTree: enrichMetricTree(snapshot.metric_tree, metricMap),
      rootScore: snapshot.root_score,
      rootStatus: snapshot.root_status,
    }))

    res.json({
      warehouses: (warehouses || []).map((w: any) => ({ ...w, _id: w.id })),
      snapshots: enrichedSnapshots,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Tree API error:', error)
    res.status(500).json({ error: 'Failed to fetch metric tree' })
  }
})

// GET /api/tree/:warehouseId - Get tree for specific warehouse
router.get('/:warehouseId', async (req: Request, res: Response) => {
  try {
    const { warehouseId } = req.params
    const { days = 7 } = req.query

    const { data: warehouse, error: whError } = await supabase
      .from('warehouses')
      .select('*')
      .eq('id', warehouseId)
      .single()

    if (whError || !warehouse) {
      return res.status(404).json({ error: 'Warehouse not found' })
    }

    // Get latest snapshot
    const { data: latestSnapshot } = await supabase
      .from('metric_snapshots')
      .select('*')
      .eq('warehouse_id', warehouseId)
      .order('timestamp', { ascending: false })
      .limit(1)
      .single()

    if (!latestSnapshot) {
      return res.status(404).json({ error: 'No data found for warehouse' })
    }

    // Get historical data for trends
    const startDate = new Date(Date.now() - (days as number) * 24 * 60 * 60 * 1000).toISOString()
    const { data: historicalData } = await supabase
      .from('metric_snapshots')
      .select('*')
      .eq('warehouse_id', warehouseId)
      .gte('timestamp', startDate)
      .order('timestamp', { ascending: true })

    // Get metric definitions
    const { data: metricDefs } = await supabase
      .from('metric_definitions')
      .select('*')

    res.json({
      warehouse,
      snapshot: {
        ...latestSnapshot,
        warehouseId: latestSnapshot.warehouse_id,
        metricTree: latestSnapshot.metric_tree,
        rootScore: latestSnapshot.root_score,
        rootStatus: latestSnapshot.root_status,
      },
      historical: historicalData || [],
      metricDefinitions: metricDefs || []
    })

  } catch (error) {
    console.error('Warehouse tree error:', error)
    res.status(500).json({ error: 'Failed to fetch warehouse data' })
  }
})

// GET /api/tree/trend/:metricId - Get trend data for specific metric
router.get('/trend/:metricId', async (req: Request, res: Response) => {
  try {
    const { metricId } = req.params
    const { warehouseId, days = 7 } = req.query

    if (!warehouseId) {
      return res.status(400).json({ error: 'warehouseId is required' })
    }

    const startDate = new Date(Date.now() - (days as number) * 24 * 60 * 60 * 1000).toISOString()

    const { data: snapshots, error } = await supabase
      .from('metric_snapshots')
      .select('timestamp, metric_tree')
      .eq('warehouse_id', warehouseId as string)
      .gte('timestamp', startDate)
      .order('timestamp', { ascending: true })

    if (error) {
      console.error('Trend query error:', error)
      return res.status(500).json({ error: 'Failed to fetch trend data' })
    }

    // Extract the specific metric score from each snapshot's metric_tree
    const trendData = (snapshots || [])
      .filter((s: any) => s.metric_tree && s.metric_tree[metricId])
      .map((s: any) => ({
        date: s.timestamp.split('T')[0],
        score: s.metric_tree[metricId].score,
        timestamp: s.timestamp
      }))

    res.json({
      metricId,
      warehouseId,
      data: trendData,
      period: `${days} days`
    })

  } catch (error) {
    console.error('Trend API error:', error)
    res.status(500).json({ error: 'Failed to fetch trend data' })
  }
})

export default router
