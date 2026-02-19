import express, { Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import { supabase } from '../lib/supabase'

const router = express.Router()

// GET /api/admin/warehouses - Get all warehouses for admin
router.get('/warehouses', async (req: Request, res: Response) => {
    try {
        const { data, error } = await supabase.from('warehouses').select('*').order('id')
        if (error) return res.status(500).json({ error: error.message })
        res.json({ warehouses: data || [] })
    } catch (e) {
        res.status(500).json({ error: 'Failed to fetch warehouses' })
    }
})

// POST /api/admin/warehouses - Add a new warehouse
router.post('/warehouses', async (req: Request, res: Response) => {
    try {
        const { id, name, zone, city, is_active } = req.body
        if (!id || !name || !zone || !city) {
            return res.status(400).json({ error: 'id, name, zone, and city are required' })
        }
        const { data, error } = await supabase
            .from('warehouses')
            .insert({ id, name, zone, city, is_active: is_active ?? true })
            .select()
            .single()
        if (error) return res.status(500).json({ error: error.message })
        res.json({ message: 'Warehouse created', warehouse: data })
    } catch (e) {
        res.status(500).json({ error: 'Failed to create warehouse' })
    }
})

// PUT /api/admin/warehouses/:id - Update a warehouse
router.put('/warehouses/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params
        const { name, zone, city, is_active } = req.body
        const updates: any = {}
        if (name !== undefined) updates.name = name
        if (zone !== undefined) updates.zone = zone
        if (city !== undefined) updates.city = city
        if (is_active !== undefined) updates.is_active = is_active

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({ error: 'Nothing to update' })
        }

        const { data, error } = await supabase
            .from('warehouses')
            .update(updates)
            .eq('id', id)
            .select()
            .single()
        if (error) return res.status(500).json({ error: error.message })
        res.json({ message: 'Warehouse updated', warehouse: data })
    } catch (e) {
        res.status(500).json({ error: 'Failed to update warehouse' })
    }
})

// POST /api/admin/warehouse-setup - Combined Warehouse & Metric Logic
router.post('/warehouse-setup', async (req: Request, res: Response) => {
    try {
        const { warehouse, metrics } = req.body

        if (!warehouse || !metrics) {
            return res.status(400).json({ error: 'Both warehouse and metrics data required' })
        }

        // 1. Upsert Warehouse
        const { data: whData, error: whError } = await supabase
            .from('warehouses')
            .upsert({
                id: warehouse.id,
                name: warehouse.name,
                zone: warehouse.zone,
                city: warehouse.city,
                is_active: warehouse.is_active ?? true
            })
            .select()
            .single()

        if (whError) return res.status(500).json({ error: `Warehouse Error: ${whError.message}` })

        // 2. Process Metrics (Calculate Rolling Avg & Predicted Score)
        const { metric_id, staff_count, hours_of_day, day_of_week } = metrics

        // Fetch last 7 days of snapshots for rolling avg
        const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
        const { data: snapshots } = await supabase
            .from('metric_snapshots')
            .select('timestamp, metric_tree')
            .eq('warehouse_id', warehouse.id)
            .gte('timestamp', startDate)

        const scores: number[] = []
        for (const snap of (snapshots || [])) {
            const metricData = snap.metric_tree?.[metric_id]
            if (metricData && metricData.score !== undefined) {
                scores.push(metricData.score)
            }
        }

        const rolling_7d_avg = scores.length > 0 ? +(scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2) : 0

        // Calculate Predicted Score
        const staffFactor = Math.min(staff_count / 50, 1.2)
        const isPeakHour = hours_of_day >= 9 && hours_of_day <= 18
        const hourFactor = isPeakHour ? 1.1 : 0.9
        const isWeekday = day_of_week >= 1 && day_of_week <= 5
        const dayFactor = isWeekday ? 1.0 : 0.85

        const predicted_score = +(Math.min(rolling_7d_avg * staffFactor * hourFactor * dayFactor, 100)).toFixed(2)
        const status = predicted_score >= 80 ? 'healthy' : predicted_score >= 60 ? 'warn' : 'critical'

        // 3. Create New Snapshot with Predicted Data
        // We'll create a basic metric tree where the selected metric uses the predicted score
        // For other metrics, we'll default to 0 or carry over if we had full tree logic (simplified here)
        const metricTree: any = {
            [metric_id]: {
                name: metric_id.toUpperCase(), // Simplification
                score: predicted_score,
                status
            },
            // Root score logic simplified to just this metric for now as per user request scope
            poi: { score: predicted_score, status, name: 'Perfect Order Index' }
        }

        await supabase.from('metric_snapshots').insert({
            warehouse_id: warehouse.id,
            timestamp: new Date().toISOString(),
            root_score: predicted_score,
            root_status: status,
            metric_tree: metricTree
        })

        res.json({
            message: 'Warehouse and metrics updated successfully',
            warehouse: whData,
            result: { rolling_7d_avg, predicted_score }
        })

    } catch (e) {
        console.error('Setup error:', e)
        res.status(500).json({ error: 'Failed to complete setup' })
    }
})

// GET /api/admin/metrics/:warehouseId - Get latest snapshot for a warehouse
router.get('/metrics/:warehouseId', async (req: Request, res: Response) => {
    try {
        const { warehouseId } = req.params
        const { data, error } = await supabase
            .from('metric_snapshots')
            .select('*')
            .eq('warehouse_id', warehouseId)
            .order('timestamp', { ascending: false })
            .limit(1)
            .single()

        if (error || !data) return res.json({ snapshot: null })
        res.json({ snapshot: data })
    } catch (e) {
        res.status(500).json({ error: 'Failed to fetch metrics' })
    }
})

// PUT /api/admin/metrics/:warehouseId - Update metric tree scores
router.put('/metrics/:warehouseId', async (req: Request, res: Response) => {
    try {
        const { warehouseId } = req.params
        const { metricTree } = req.body

        if (!metricTree) return res.status(400).json({ error: 'metricTree is required' })

        const rootScore = metricTree.poi?.score ?? 0
        const rootStatus = rootScore >= 80 ? 'healthy' : rootScore >= 60 ? 'warn' : 'critical'

        const { data, error } = await supabase
            .from('metric_snapshots')
            .insert({
                warehouse_id: warehouseId,
                timestamp: new Date().toISOString(),
                root_score: rootScore,
                root_status: rootStatus,
                metric_tree: metricTree
            })
            .select()
            .single()

        if (error) return res.status(500).json({ error: error.message })
        res.json({ message: 'Metrics updated successfully', snapshot: data })
    } catch (e) {
        res.status(500).json({ error: 'Failed to update metrics' })
    }
})

// POST /api/admin/rolling-avg - Calculate rolling 7-day average for a metric
router.post('/rolling-avg', async (req: Request, res: Response) => {
    try {
        const { warehouse_id, metric_id, staff_count, hours_of_day, day_of_week } = req.body

        if (!warehouse_id || !metric_id || staff_count === undefined || hours_of_day === undefined || day_of_week === undefined) {
            return res.status(400).json({ error: 'All fields are required: warehouse_id, metric_id, staff_count, hours_of_day, day_of_week' })
        }

        // Fetch last 7 days of snapshots for this warehouse
        const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
        const { data: snapshots, error } = await supabase
            .from('metric_snapshots')
            .select('timestamp, metric_tree')
            .eq('warehouse_id', warehouse_id)
            .gte('timestamp', startDate)
            .order('timestamp', { ascending: true })

        if (error) return res.status(500).json({ error: error.message })

        // Extract the specific metric scores from each snapshot
        const scores: number[] = []
        for (const snap of (snapshots || [])) {
            const metricData = snap.metric_tree?.[metric_id]
            if (metricData && metricData.score !== undefined) {
                scores.push(metricData.score)
            }
        }

        // Calculate rolling 7-day average
        const rolling_7d_avg = scores.length > 0 ? +(scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2) : 0

        // Operational factor: adjust prediction based on staffing and time
        // More staff → higher score, peak hours (10-18) → higher throughput
        const staffFactor = Math.min(staff_count / 50, 1.2)  // normalized around 50 staff
        const isPeakHour = hours_of_day >= 9 && hours_of_day <= 18
        const hourFactor = isPeakHour ? 1.1 : 0.9
        const isWeekday = day_of_week >= 1 && day_of_week <= 5
        const dayFactor = isWeekday ? 1.0 : 0.85

        const predicted_score = +(Math.min(rolling_7d_avg * staffFactor * hourFactor * dayFactor, 100)).toFixed(2)

        res.json({ rolling_7d_avg, predicted_score })
    } catch (e) {
        console.error('Rolling avg error:', e)
        res.status(500).json({ error: 'Failed to calculate rolling average' })
    }
})

// GET /api/admin/alerts - Get all alerts
router.get('/alerts', async (req: Request, res: Response) => {
    try {
        const { data, error } = await supabase
            .from('alerts')
            .select('*')
            .order('created_at', { ascending: false })
        if (error) return res.status(500).json({ error: error.message })
        res.json({ alerts: data || [] })
    } catch (e) {
        res.status(500).json({ error: 'Failed to fetch alerts' })
    }
})

// PUT /api/admin/alerts/:id/resolve - Resolve an alert
router.put('/alerts/:id/resolve', async (req: Request, res: Response) => {
    try {
        const { id } = req.params
        const { data, error } = await supabase
            .from('alerts')
            .update({ resolved_at: new Date().toISOString() })
            .eq('id', id)
            .select()
            .single()

        if (error) return res.status(500).json({ error: error.message })
        res.json({ message: 'Alert resolved', alert: data })
    } catch (e) {
        res.status(500).json({ error: 'Failed to resolve alert' })
    }
})

// DELETE /api/admin/alerts/:id - Delete an alert
router.delete('/alerts/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params
        const { error } = await supabase.from('alerts').delete().eq('id', id)
        if (error) return res.status(500).json({ error: error.message })
        res.json({ message: 'Alert deleted' })
    } catch (e) {
        res.status(500).json({ error: 'Failed to delete alert' })
    }
})

// GET /api/admin/users - Get all users
router.get('/users', async (req: Request, res: Response) => {
    try {
        const { data, error } = await supabase
            .from('users')
            .select('id, name, email, role, last_login, created_at')
            .order('created_at', { ascending: false })
        if (error) return res.status(500).json({ error: error.message })
        res.json({ users: data || [] })
    } catch (e) {
        res.status(500).json({ error: 'Failed to fetch users' })
    }
})

// PUT /api/admin/users/:id/role - Update user role
router.put('/users/:id/role', async (req: Request, res: Response) => {
    try {
        const { id } = req.params
        const { role } = req.body
        if (!['analyst', 'manager'].includes(role)) {
            return res.status(400).json({ error: 'Invalid role' })
        }
        const { data, error } = await supabase
            .from('users')
            .update({ role })
            .eq('id', id)
            .select('id, name, email, role')
            .single()

        if (error) return res.status(500).json({ error: error.message })
        res.json({ message: 'Role updated', user: data })
    } catch (e) {
        res.status(500).json({ error: 'Failed to update role' })
    }
})

// DELETE /api/admin/users/:id - Delete a user
router.delete('/users/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params
        // Prevent deleting yourself
        if (id === (req as any).user?.userId) {
            return res.status(400).json({ error: 'Cannot delete your own account' })
        }
        const { error } = await supabase.from('users').delete().eq('id', id)
        if (error) return res.status(500).json({ error: error.message })
        res.json({ message: 'User deleted' })
    } catch (e) {
        res.status(500).json({ error: 'Failed to delete user' })
    }
})

// GET /api/admin/logs - Get system logs (agent_logs)
router.get('/logs', async (req: Request, res: Response) => {
    try {
        const { limit = 50 } = req.query
        const { data, error } = await supabase
            .from('agent_logs')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(parseInt(limit as string))
        if (error) return res.status(500).json({ error: error.message })
        res.json({ logs: data || [] })
    } catch (e) {
        res.status(500).json({ error: 'Failed to fetch logs' })
    }
})

// PUT /api/admin/profile - Update admin profile
router.put('/profile', async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.userId
        const { name, currentPassword, newPassword } = req.body

        const updates: any = {}
        if (name) updates.name = name

        if (newPassword) {
            // Verify current password
            const { data: user } = await supabase
                .from('users')
                .select('password_hash')
                .eq('id', userId)
                .single()

            if (!user) return res.status(404).json({ error: 'User not found' })

            const isValid = await bcrypt.compare(currentPassword, user.password_hash)
            if (!isValid) return res.status(401).json({ error: 'Current password is incorrect' })

            const salt = await bcrypt.genSalt(10)
            updates.password_hash = await bcrypt.hash(newPassword, salt)
        }

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({ error: 'Nothing to update' })
        }

        const { data, error } = await supabase
            .from('users')
            .update(updates)
            .eq('id', userId)
            .select('id, name, email, role')
            .single()

        if (error) return res.status(500).json({ error: error.message })
        res.json({ message: 'Profile updated', user: data })
    } catch (e) {
        res.status(500).json({ error: 'Failed to update profile' })
    }
})

export default router
