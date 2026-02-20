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

// GET /api/reports/download/:warehouseId - Generate PDF report
router.get('/download/:warehouseId', async (req: Request, res: Response) => {
  try {
    const { warehouseId } = req.params
    const { days = 7 } = req.query

    // Fetch warehouse info
    const { data: warehouse, error: whError } = await supabase
      .from('warehouses')
      .select('*')
      .eq('id', warehouseId)
      .single()

    if (whError || !warehouse) {
      return res.status(404).json({ error: 'Warehouse not found' })
    }

    // Fetch snapshots
    const startDate = new Date(Date.now() - (days as number) * 24 * 60 * 60 * 1000).toISOString()
    const { data: snapshots } = await supabase
      .from('metric_snapshots')
      .select('*')
      .eq('warehouse_id', warehouseId)
      .gte('timestamp', startDate)
      .order('timestamp', { ascending: false })

    // Fetch alerts
    const { data: alerts } = await supabase
      .from('alerts')
      .select('*')
      .eq('warehouse_id', warehouseId)
      .is('resolved_at', null)
      .order('created_at', { ascending: false })
      .limit(20)

    // Get Summary (Rule-based)
    let aiSummary = ''
    try {
      const latestSnapshot = snapshots?.[0]
      const metricTree = latestSnapshot?.metric_tree || {}

      const score = metricTree?.poi?.score ?? 0
      const status = metricTree?.poi?.status ?? 'unknown'
      const alertCount = alerts?.length || 0

      aiSummary = `Executive Summary: The warehouse ${warehouse.name} is currently operating with a ${status} status. The overall Perfect Order Index (POI) is ${score.toFixed(1)}%. There are currently ${alertCount} active alerts requiring attention. ${score < 90 ? 'Immediate action is recommended to resolve pending alerts and improve operational efficiency.' : 'Performance is stable.'}`
    } catch (err) {
      console.warn('Summary generation failed:', err)
      aiSummary = 'Summary unavailable.'
    }

    // Generate PDF
    const PDFDocument = require('pdfkit')
    const doc = new PDFDocument({ size: 'A4', margin: 50 })

    // Set response headers
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="Nexen_Report_${warehouse.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf"`)
    doc.pipe(res)

    // ── PDF Header ──
    doc.fontSize(24).fillColor('#4F46E5').text('NEXEN', { align: 'center' })
    doc.fontSize(10).fillColor('#94A3B8').text('Supply Chain Intelligence Platform', { align: 'center' })
    doc.moveDown(0.5)
    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#E2E8F0').stroke()
    doc.moveDown(0.8)

    // ── Warehouse Info ──
    doc.fontSize(16).fillColor('#1E293B').text('Warehouse Performance Report')
    doc.moveDown(0.3)
    doc.fontSize(10).fillColor('#64748B')
      .text(`Warehouse: ${warehouse.name}`)
      .text(`Zone: ${warehouse.zone} | City: ${warehouse.city}`)
      .text(`Report Period: Last ${days} days`)
      .text(`Generated: ${new Date().toLocaleString()}`)
    doc.moveDown(1)

    // ── AI Executive Summary ──
    if (aiSummary) {
      doc.fontSize(13).fillColor('#4F46E5').text('🤖 AI Executive Summary')
      doc.moveDown(0.3)
      doc.fontSize(10).fillColor('#334155').text(aiSummary, { width: 495 })
      doc.moveDown(1)
    }

    // ── Metrics Table ──
    const latestSnap = snapshots?.[0]
    const tree = latestSnap?.metric_tree || {}
    const metricNames: Record<string, string> = {
      poi: 'Perfect Order Index', otd: 'On-Time Delivery', oa: 'Order Accuracy',
      dfr: 'Damage Free Rate', wpt: 'Warehouse Processing', tt: 'Transit Time',
      pick: 'Picking Time', label: 'Label Generation', pack: 'Packing Speed',
    }

    doc.fontSize(13).fillColor('#4F46E5').text('📊 Metric Scores')
    doc.moveDown(0.5)

    // Table header
    const tableTop = doc.y
    const col1 = 50, col2 = 280, col3 = 380, col4 = 460
    doc.fontSize(9).fillColor('#FFFFFF')
    doc.rect(col1, tableTop, 495, 20).fill('#4F46E5')
    doc.text('Metric', col1 + 10, tableTop + 5, { width: 220 })
    doc.text('Score', col2 + 10, tableTop + 5, { width: 80 })
    doc.text('Status', col3 + 10, tableTop + 5, { width: 70 })
    doc.text('Trend', col4 + 10, tableTop + 5, { width: 60 })

    let rowY = tableTop + 22
    const metricKeys = Object.keys(metricNames)
    metricKeys.forEach((key, idx) => {
      const m = tree[key]
      if (!m || typeof m !== 'object') return
      const bgColor = idx % 2 === 0 ? '#F8FAFC' : '#FFFFFF'
      doc.rect(col1, rowY, 495, 18).fill(bgColor)
      doc.fontSize(9).fillColor('#1E293B')
        .text(metricNames[key], col1 + 10, rowY + 4, { width: 220 })
      const scoreColor = (m.score >= 90) ? '#16A34A' : (m.score >= 50) ? '#D97706' : '#DC2626'
      doc.fillColor(scoreColor).text(`${(m.score ?? 0).toFixed(1)}%`, col2 + 10, rowY + 4, { width: 80 })
      const statusLabel = m.status === 'healthy' ? '✅ Healthy' : m.status === 'warn' ? '⚠️ Warning' : '🔴 Critical'
      doc.fillColor('#475569').text(statusLabel, col3 + 10, rowY + 4, { width: 70 })
      const trendLabel = m.trend === 'up' ? '↑' : m.trend === 'down' ? '↓' : '→'
      doc.text(trendLabel, col4 + 10, rowY + 4, { width: 60 })
      rowY += 18
    })
    doc.y = rowY + 10
    doc.moveDown(1)

    // ── Active Alerts ──
    const activeAlerts = alerts || []
    doc.fontSize(13).fillColor('#4F46E5').text(`🔔 Active Alerts (${activeAlerts.length})`)
    doc.moveDown(0.3)

    if (activeAlerts.length === 0) {
      doc.fontSize(10).fillColor('#16A34A').text('✅ No active alerts — all systems healthy')
    } else {
      activeAlerts.slice(0, 10).forEach((alert: any) => {
        const icon = alert.severity === 'critical' ? '🔴' : '🟡'
        doc.fontSize(9).fillColor('#1E293B')
          .text(`${icon} ${alert.metric_id?.toUpperCase() || 'Unknown'} — Score: ${alert.score?.toFixed(1) || '?'} — ${alert.ai_summary || alert.severity}`, { width: 495 })
        doc.moveDown(0.2)
      })
    }

    // ── Footer ──
    doc.moveDown(2)
    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#E2E8F0').stroke()
    doc.moveDown(0.3)
    doc.fontSize(8).fillColor('#94A3B8').text('Generated by Nexen — Supply Chain Intelligence Platform | Powered by Gemini AI', { align: 'center' })

    doc.end()
  } catch (error) {
    console.error('PDF report generation error:', error)
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to generate PDF report' })
    }
  }
})

export default router
