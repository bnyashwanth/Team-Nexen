import express, { Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import { supabase } from '../lib/supabase'

const router = express.Router()

// POST /api/seed - Generate complete demo data (Public access)
router.post('/', async (req: Request, res: Response) => {
    try {
        // ──────────────────────────────────────
        // 1. Create Admin User (adminraj@gmail.com)
        // ──────────────────────────────────────
        const { data: existingUser } = await supabase
            .from('users')
            .select('id')
            .eq('email', 'adminraj@gmail.com')
            .single()

        if (!existingUser) {
            const salt = await bcrypt.genSalt(10)
            const passwordHash = await bcrypt.hash('abcd', salt)

            const { error: userError } = await supabase
                .from('users')
                .insert({
                    name: 'Admin',
                    email: 'adminraj@gmail.com',
                    password_hash: passwordHash,
                    role: 'manager'
                })

            if (userError) {
                console.error('User creation error:', userError)
            } else {
                console.log('✅ Created admin user: adminraj@gmail.com / abcd')
            }
        }

        // ──────────────────────────────────────
        // 2. Create Warehouses
        // ──────────────────────────────────────
        const warehousesToCreate = [
            { id: 'wh_001', name: 'Bangalore Central', zone: 'South', city: 'Bangalore', is_active: true },
            { id: 'wh_002', name: 'Delhi North Hub', zone: 'North', city: 'Delhi', is_active: true },
            { id: 'wh_003', name: 'Mumbai West', zone: 'West', city: 'Mumbai', is_active: true }
        ]

        for (const wh of warehousesToCreate) {
            const { data: exists } = await supabase
                .from('warehouses')
                .select('id')
                .eq('id', wh.id)
                .single()

            if (!exists) {
                const { error } = await supabase.from('warehouses').insert(wh)
                if (error) console.error(`Warehouse ${wh.id} error:`, error)
            }
        }
        console.log('✅ Warehouses ready')

        // ──────────────────────────────────────
        // 3. Create Metric Definitions (8 metrics)
        //    poi → otd/oa/dfr → wpt/tt → pick/label/pack
        // ──────────────────────────────────────
        const { count: defCount } = await supabase
            .from('metric_definitions')
            .select('*', { count: 'exact', head: true })

        if (!defCount || defCount === 0) {
            const definitions = [
                { metric_id: 'poi', name: 'Perfect Order Index', parent_id: null, impact_weight: 1.0, threshold_warn: 80, threshold_crit: 60, unit: '%' },
                { metric_id: 'otd', name: 'On-Time Delivery', parent_id: 'poi', impact_weight: 0.60, threshold_warn: 85, threshold_crit: 70, unit: '%' },
                { metric_id: 'oa', name: 'Order Accuracy', parent_id: 'poi', impact_weight: 0.25, threshold_warn: 95, threshold_crit: 88, unit: '%' },
                { metric_id: 'dfr', name: 'Damage Free Rate', parent_id: 'poi', impact_weight: 0.15, threshold_warn: 97, threshold_crit: 90, unit: '%' },
                { metric_id: 'wpt', name: 'Warehouse Processing', parent_id: 'otd', impact_weight: 0.55, threshold_warn: 80, threshold_crit: 60, unit: '%' },
                { metric_id: 'tt', name: 'Transit Time', parent_id: 'otd', impact_weight: 0.45, threshold_warn: 85, threshold_crit: 70, unit: '%' },
                { metric_id: 'pick', name: 'Picking Time', parent_id: 'wpt', impact_weight: 0.30, threshold_warn: 90, threshold_crit: 70, unit: '%' },
                { metric_id: 'label', name: 'Label Generation', parent_id: 'wpt', impact_weight: 0.40, threshold_warn: 90, threshold_crit: 60, unit: 'hrs' },
                { metric_id: 'pack', name: 'Packing Speed', parent_id: 'wpt', impact_weight: 0.30, threshold_warn: 90, threshold_crit: 70, unit: '%' }
            ]

            const { error: defError } = await supabase
                .from('metric_definitions')
                .insert(definitions)

            if (defError) {
                console.error('Metric definitions error:', defError)
            } else {
                console.log('✅ Created 9 metric definitions')
            }
        }

        // ──────────────────────────────────────
        // 4. Create 7-day Historical Snapshots
        //    Label Generation degrades over time → today is CRITICAL
        // ──────────────────────────────────────
        const now = new Date()

        // Score progressions over 7 days (label degrades, others stable)
        const dailyScores = [
            { day: -6, label: 95, wpt: 92, otd: 90, poi: 93 },
            { day: -5, label: 94, wpt: 91, otd: 89, poi: 92 },
            { day: -4, label: 92, wpt: 89, otd: 87, poi: 91 },
            { day: -3, label: 88, wpt: 82, otd: 80, poi: 87 },
            { day: -2, label: 61, wpt: 55, otd: 60, poi: 76 },
            { day: -1, label: 12, wpt: 25, otd: 48, poi: 69 },
            { day: 0, label: 5, wpt: 18, otd: 45, poi: 67 }  // TODAY — CRITICAL
        ]

        // Delete old snapshots for wh_001 to avoid duplicates
        await supabase
            .from('metric_snapshots')
            .delete()
            .eq('warehouse_id', 'wh_001')

        for (const day of dailyScores) {
            const ts = new Date(now)
            ts.setDate(ts.getDate() + day.day)
            ts.setHours(9, 30, 0, 0)

            const labelStatus = day.label < 60 ? 'critical' : day.label < 90 ? 'warn' : 'healthy'
            const wptStatus = day.wpt < 60 ? 'critical' : day.wpt < 80 ? 'warn' : 'healthy'
            const otdStatus = day.otd < 70 ? 'critical' : day.otd < 85 ? 'warn' : 'healthy'
            const poiStatus = day.poi < 60 ? 'critical' : day.poi < 80 ? 'warn' : 'healthy'

            const snapshot = {
                warehouse_id: 'wh_001',
                timestamp: ts.toISOString(),
                root_score: day.poi,
                root_status: poiStatus,
                metric_tree: {
                    poi: { score: day.poi, status: poiStatus, name: 'Perfect Order Index' },
                    otd: { score: day.otd, status: otdStatus, name: 'On-Time Delivery', impactWeight: 0.60 },
                    oa: { score: 99, status: 'healthy', name: 'Order Accuracy', impactWeight: 0.25 },
                    dfr: { score: 99.5, status: 'healthy', name: 'Damage Free Rate', impactWeight: 0.15 },
                    wpt: { score: day.wpt, status: wptStatus, name: 'Warehouse Processing', avgTime: day.day === 0 ? '6.2hrs' : undefined, target: '30min', impactWeight: 0.55 },
                    tt: { score: 95, status: 'healthy', name: 'Transit Time', impactWeight: 0.45 },
                    pick: { score: 98, status: 'healthy', name: 'Picking Time', impactWeight: 0.30 },
                    pack: { score: 96, status: 'healthy', name: 'Packing Speed', impactWeight: 0.30 },
                    label: {
                        score: day.label,
                        status: labelStatus,
                        name: 'Label Generation',
                        impactWeight: 0.40,
                        ...(day.day === 0 ? { avgTime: '6.2hrs', errorCode: '401_UNAUTHORIZED', affectedZone: 'North' } : {})
                    }
                }
            }

            const { error } = await supabase.from('metric_snapshots').insert(snapshot)
            if (error) console.error(`Snapshot day ${day.day} error:`, error)
        }
        console.log('✅ Created 7-day snapshot history')

        // Also add healthy snapshots for wh_002 and wh_003
        await supabase.from('metric_snapshots').delete().eq('warehouse_id', 'wh_002')
        await supabase.from('metric_snapshots').delete().eq('warehouse_id', 'wh_003')

        // Helper to create healthy snapshots with custom variance
        const healthySnapshot = (whId: string, targetScore: number) => {
            // Slight randomness around target
            const vary = (base: number) => Math.min(Math.max(base + (Math.random() * 4 - 2), 0), 100)
            const poi = vary(targetScore)

            return {
                warehouse_id: whId,
                timestamp: now.toISOString(),
                root_score: parseFloat(poi.toFixed(1)),
                root_status: 'healthy',
                metric_tree: {
                    poi: { score: parseFloat(poi.toFixed(1)), status: 'healthy', name: 'Perfect Order Index' },
                    otd: { score: parseFloat(vary(poi + 2).toFixed(1)), status: 'healthy', name: 'On-Time Delivery', impactWeight: 0.60 },
                    oa: { score: parseFloat(vary(98).toFixed(1)), status: 'healthy', name: 'Order Accuracy', impactWeight: 0.25 },
                    dfr: { score: parseFloat(vary(99).toFixed(1)), status: 'healthy', name: 'Damage Free Rate', impactWeight: 0.15 },
                    wpt: { score: parseFloat(vary(poi - 1).toFixed(1)), status: 'healthy', name: 'Warehouse Processing', impactWeight: 0.55 },
                    tt: { score: parseFloat(vary(95).toFixed(1)), status: 'healthy', name: 'Transit Time', impactWeight: 0.45 },
                    pick: { score: parseFloat(vary(94).toFixed(1)), status: 'healthy', name: 'Picking Time', impactWeight: 0.30 },
                    pack: { score: parseFloat(vary(92).toFixed(1)), status: 'healthy', name: 'Packing Speed', impactWeight: 0.30 },
                    label: { score: parseFloat(vary(96).toFixed(1)), status: 'healthy', name: 'Label Generation', impactWeight: 0.40 }
                }
            }
        }

        // Delhi (wh_002) - High performer
        await supabase.from('metric_snapshots').insert(healthySnapshot('wh_002', 94.5))

        // Mumbai (wh_003) - Good but slightly lower
        await supabase.from('metric_snapshots').insert(healthySnapshot('wh_003', 89.2))

        console.log('✅ Created distinct snapshots for all warehouses')

        // ──────────────────────────────────────
        // 5. Create Critical Alert (label drop)
        // ──────────────────────────────────────
        await supabase.from('alerts').delete().eq('warehouse_id', 'wh_001').eq('metric_id', 'label')

        const { error: alertError } = await supabase
            .from('alerts')
            .insert({
                warehouse_id: 'wh_001',
                metric_id: 'label',
                severity: 'critical',
                score: 5,
                ai_summary: 'Label Generation at Bangalore Central has dropped to 5% due to a 401 API error from North Zone courier. Estimated 340+ orders delayed. Immediate API key rotation required.',
                resolved_at: null
            })

        if (alertError) console.error('Alert error:', alertError)
        else console.log('✅ Created critical alert')

        res.json({
            message: 'Demo data generated successfully!',
            details: {
                user: 'raj@gmail.com (password: abcd)',
                warehouses: 3,
                metricDefinitions: 9,
                snapshots: '7-day history + 2 healthy warehouses',
                alerts: 1
            }
        })

    } catch (error) {
        console.error('Seed error:', error)
        res.status(500).json({ error: 'Failed to generate demo data' })
    }
})

export default router
