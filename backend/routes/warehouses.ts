import express, { Request, Response } from 'express'
import { supabase } from '../lib/supabase'

const router = express.Router()

// GET /api/warehouses - Get all active warehouses
router.get('/', async (req: Request, res: Response) => {
  try {
    const { data: warehouses, error } = await supabase
      .from('warehouses')
      .select('*')
      .eq('is_active', true)
      .order('id', { ascending: true })

    if (error) {
      console.error('Warehouses query error:', error)
      return res.status(500).json({ error: 'Failed to fetch warehouses' })
    }

    res.json({ warehouses: warehouses || [] })

  } catch (error) {
    console.error('Warehouses API error:', error)
    res.status(500).json({ error: 'Failed to fetch warehouses' })
  }
})

// GET /api/warehouses/:id - Get specific warehouse
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { data: warehouse, error } = await supabase
      .from('warehouses')
      .select('*')
      .eq('id', req.params.id)
      .single()

    if (error || !warehouse) {
      return res.status(404).json({ error: 'Warehouse not found' })
    }

    res.json({ warehouse })

  } catch (error) {
    console.error('Warehouse detail error:', error)
    res.status(500).json({ error: 'Failed to fetch warehouse' })
  }
})

// POST /api/warehouses - Create new warehouse (manager only)
router.post('/', async (req: Request, res: Response) => {
  try {
    if ((req as any).user?.role !== 'manager') {
      return res.status(403).json({ error: 'Manager access required' })
    }

    const { name, zone, city } = req.body

    if (!name || !zone || !city) {
      return res.status(400).json({ error: 'Name, zone, and city are required' })
    }

    // Generate a sequential warehouse ID
    const { count } = await supabase
      .from('warehouses')
      .select('id', { count: 'exact', head: true })

    const nextId = `wh_${String((count || 0) + 1).padStart(3, '0')}`

    const { data: warehouse, error } = await supabase
      .from('warehouses')
      .insert({
        id: nextId,
        name,
        zone,
        city
      })
      .select('*')
      .single()

    if (error) {
      console.error('Create warehouse error:', error)
      return res.status(500).json({ error: 'Failed to create warehouse' })
    }

    res.status(201).json({ warehouse })

  } catch (error) {
    console.error('Create warehouse error:', error)
    res.status(500).json({ error: 'Failed to create warehouse' })
  }
})

export default router
