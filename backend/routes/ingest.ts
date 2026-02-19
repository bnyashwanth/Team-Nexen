import express, { Request, Response } from 'express'
import { supabase } from '../lib/supabase'

const router = express.Router()

// POST /api/ingest
router.post('/', async (req: Request, res: Response) => {
  try {
    const { warehouse_id, metric_id, score, orders_volume, staff_count } = req.body

    // Validate required fields
    if (!warehouse_id || !metric_id || score === undefined || !orders_volume || !staff_count) {
      return res.status(400).json({ error: 'All fields are required' })
    }

    // Validate score range
    if (score < 0 || score > 100) {
      return res.status(400).json({ error: 'Score must be between 0 and 100' })
    }

    // Check if warehouse exists
    const { data: warehouse, error: whError } = await supabase
      .from('warehouses')
      .select('id')
      .eq('id', warehouse_id)
      .single()

    if (whError || !warehouse) {
      return res.status(404).json({ error: 'Warehouse not found' })
    }

    const rootStatus = score >= 80 ? 'healthy' : score >= 60 ? 'warn' : 'critical'

    // Create metric snapshot
    const { data: snapshot, error: insertError } = await supabase
      .from('metric_snapshots')
      .insert({
        warehouse_id,
        timestamp: new Date().toISOString(),
        metric_tree: {
          id: metric_id,
          score: parseFloat(score),
          ordersVolume: parseInt(orders_volume),
          staffCount: parseInt(staff_count),
          status: rootStatus
        },
        root_score: parseFloat(score),
        root_status: rootStatus
      })
      .select('*')
      .single()

    if (insertError) {
      console.error('Ingest insert error:', insertError)
      return res.status(500).json({ error: 'Failed to ingest data' })
    }

    res.status(201).json({
      message: 'Data successfully ingested and analyzed',
      data: {
        warehouseId: warehouse_id,
        metricId: metric_id,
        score: parseFloat(score),
        status: rootStatus,
        timestamp: snapshot.timestamp
      }
    })

  } catch (error) {
    console.error('Ingest error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})



export default router
