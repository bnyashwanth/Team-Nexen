import express, { Request, Response } from 'express'
import { supabase } from '../lib/supabase'

const router = express.Router()

// GET /api/reports/warehouse/:warehouseId - Generate warehouse report
router.get('/warehouse/:warehouseId', async (req: Request, res: Response) => {
  try {
    if ((req as any).user?.role !== 'manager') {
      return res.status(403).json({ error: 'Manager access required for reports' })
    }

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

    // Get metric snapshots for the period
    const startDate = new Date(Date.now() - (days as number) * 24 * 60 * 60 * 1000).toISOString()

    const { data: snapshots } = await supabase
      .from('metric_snapshots')
      .select('*')
      .eq('warehouse_id', warehouseId)
      .gte('timestamp', startDate)
      .order('timestamp', { ascending: true })

    // Get unresolved alerts
    const { data: alerts } = await supabase
      .from('alerts')
      .select('*')
      .eq('warehouse_id', warehouseId)
      .is('resolved_at', null)
      .order('created_at', { ascending: false })

    // Calculate summary statistics
    const summary = calculateSummary(snapshots || [], alerts || [])

    res.json({
      warehouse,
      period: `${days} days`,
      summary,
      snapshots: snapshots || [],
      alerts: alerts || [],
      generatedAt: new Date().toISOString()
    })

  } catch (error) {
    console.error('Report generation error:', error)
    res.status(500).json({ error: 'Failed to generate report' })
  }
})

// GET /api/reports/export/:warehouseId - Export data for PDF/CSV
router.get('/export/:warehouseId', async (req: Request, res: Response) => {
  try {
    if ((req as any).user?.role !== 'manager') {
      return res.status(403).json({ error: 'Manager access required for export' })
    }

    const { warehouseId } = req.params
    const { format = 'json' } = req.query

    const { data: warehouse, error: whError } = await supabase
      .from('warehouses')
      .select('*')
      .eq('id', warehouseId)
      .single()

    if (whError || !warehouse) {
      return res.status(404).json({ error: 'Warehouse not found' })
    }

    // Get data for export (last 30 days)
    const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

    const { data: snapshots } = await supabase
      .from('metric_snapshots')
      .select('*')
      .eq('warehouse_id', warehouseId)
      .gte('timestamp', startDate)
      .order('timestamp', { ascending: true })

    const { data: alerts } = await supabase
      .from('alerts')
      .select('*')
      .eq('warehouse_id', warehouseId)
      .gte('created_at', startDate)
      .order('created_at', { ascending: true })

    const exportData = {
      warehouse,
      exportDate: new Date().toISOString(),
      snapshots: (snapshots || []).map((s: any) => ({
        timestamp: s.timestamp,
        rootScore: s.root_score,
        rootStatus: s.root_status,
        metricTree: s.metric_tree
      })),
      alerts: (alerts || []).map((a: any) => ({
        createdAt: a.created_at,
        metricId: a.metric_id,
        severity: a.severity,
        score: a.score,
        aiSummary: a.ai_summary,
        resolvedAt: a.resolved_at
      }))
    }

    if (format === 'csv') {
      // Convert to CSV format (simplified)
      const csvData = convertToCSV(exportData)
      res.setHeader('Content-Type', 'text/csv')
      res.setHeader('Content-Disposition', `attachment; filename="${warehouseId}_report.csv"`)
      res.send(csvData)
    } else {
      // Default JSON format
      res.json(exportData)
    }

  } catch (error) {
    console.error('Export error:', error)
    res.status(500).json({ error: 'Failed to export data' })
  }
})

// Helper function to calculate summary statistics
function calculateSummary(snapshots: any[], alerts: any[]): any {
  if (snapshots.length === 0) {
    return {
      avgScore: 0,
      minScore: 0,
      maxScore: 0,
      criticalIncidents: 0,
      totalAlerts: alerts.length
    }
  }

  const scores = snapshots.map((s: any) => s.root_score)
  const criticalIncidents = alerts.filter((a: any) => a.severity === 'critical').length

  return {
    avgScore: (scores.reduce((a: number, b: number) => a + b, 0) / scores.length).toFixed(2),
    minScore: Math.min(...scores),
    maxScore: Math.max(...scores),
    criticalIncidents,
    totalAlerts: alerts.length,
    dataPoints: snapshots.length
  }
}

// Helper function to convert to CSV
function convertToCSV(data: any): string {
  const headers = ['Date', 'Root Score', 'Root Status', 'Metric ID', 'Alert Severity', 'AI Summary']
  const rows: string[] = []

  // Combine snapshots and alerts into timeline
  const timeline: any[] = []

  data.snapshots.forEach((s: any) => {
    timeline.push({
      date: s.timestamp,
      rootScore: s.rootScore,
      rootStatus: s.rootStatus,
      metricId: '',
      severity: '',
      summary: ''
    })
  })

  data.alerts.forEach((a: any) => {
    timeline.push({
      date: a.createdAt,
      rootScore: a.score,
      rootStatus: '',
      metricId: a.metricId,
      severity: a.severity,
      summary: a.aiSummary
    })
  })

  timeline.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  rows.push(headers.join(','))
  timeline.forEach(item => {
    const row = [
      item.date,
      item.rootScore || '',
      item.rootStatus || '',
      item.metricId || '',
      item.severity || '',
      `"${item.summary || ''}"` // Quote text fields
    ]
    rows.push(row.join(','))
  })

  return rows.join('\n')
}

export default router
