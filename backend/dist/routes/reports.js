"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const MetricSnapshot_1 = __importDefault(require("../models/MetricSnapshot"));
const Alert_1 = __importDefault(require("../models/Alert"));
const Warehouse_1 = __importDefault(require("../models/Warehouse"));
const router = express_1.default.Router();
// GET /api/reports/warehouse/:warehouseId - Generate warehouse report
router.get('/warehouse/:warehouseId', async (req, res) => {
    try {
        if (req.user?.role !== 'manager') {
            return res.status(403).json({ error: 'Manager access required for reports' });
        }
        const { warehouseId } = req.params;
        const { days = 7 } = req.query;
        const warehouse = await Warehouse_1.default.findById(warehouseId);
        if (!warehouse) {
            return res.status(404).json({ error: 'Warehouse not found' });
        }
        // Get metric snapshots for the period
        const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
        const snapshots = await MetricSnapshot_1.default.find({
            warehouseId,
            timestamp: { $gte: startDate }
        }).sort({ timestamp: 1 });
        // Get unresolved alerts
        const alerts = await Alert_1.default.find({
            warehouseId,
            resolvedAt: null
        }).sort({ createdAt: -1 });
        // Calculate summary statistics
        const summary = calculateSummary(snapshots, alerts);
        res.json({
            warehouse,
            period: `${days} days`,
            summary,
            snapshots,
            alerts,
            generatedAt: new Date().toISOString()
        });
    }
    catch (error) {
        console.error('Report generation error:', error);
        res.status(500).json({ error: 'Failed to generate report' });
    }
});
// GET /api/reports/export/:warehouseId - Export data for PDF/CSV
router.get('/export/:warehouseId', async (req, res) => {
    try {
        if (req.user?.role !== 'manager') {
            return res.status(403).json({ error: 'Manager access required for export' });
        }
        const { warehouseId } = req.params;
        const { format = 'json' } = req.query;
        const warehouse = await Warehouse_1.default.findById(warehouseId);
        if (!warehouse) {
            return res.status(404).json({ error: 'Warehouse not found' });
        }
        // Get data for export
        const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const snapshots = await MetricSnapshot_1.default.find({
            warehouseId,
            timestamp: { $gte: startDate }
        }).sort({ timestamp: 1 });
        const alerts = await Alert_1.default.find({
            warehouseId,
            createdAt: { $gte: startDate }
        }).sort({ createdAt: 1 });
        const exportData = {
            warehouse,
            exportDate: new Date().toISOString(),
            snapshots: snapshots.map((s) => ({
                timestamp: s.timestamp,
                rootScore: s.rootScore,
                rootStatus: s.rootStatus,
                metricTree: s.metricTree
            })),
            alerts: alerts.map((a) => ({
                createdAt: a.createdAt,
                metricId: a.metricId,
                severity: a.severity,
                score: a.score,
                aiSummary: a.aiSummary,
                resolvedAt: a.resolvedAt
            }))
        };
        if (format === 'csv') {
            // Convert to CSV format (simplified)
            const csvData = convertToCSV(exportData);
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename="${warehouseId}_report.csv"`);
            res.send(csvData);
        }
        else {
            // Default JSON format
            res.json(exportData);
        }
    }
    catch (error) {
        console.error('Export error:', error);
        res.status(500).json({ error: 'Failed to export data' });
    }
});
// Helper function to calculate summary statistics
function calculateSummary(snapshots, alerts) {
    if (snapshots.length === 0) {
        return {
            avgScore: 0,
            minScore: 0,
            maxScore: 0,
            criticalIncidents: 0,
            totalAlerts: alerts.length
        };
    }
    const scores = snapshots.map((s) => s.rootScore);
    const criticalIncidents = alerts.filter((a) => a.severity === 'critical').length;
    return {
        avgScore: (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2),
        minScore: Math.min(...scores),
        maxScore: Math.max(...scores),
        criticalIncidents,
        totalAlerts: alerts.length,
        dataPoints: snapshots.length
    };
}
// Helper function to convert to CSV
function convertToCSV(data) {
    const headers = ['Date', 'Root Score', 'Root Status', 'Metric ID', 'Alert Severity', 'AI Summary'];
    const rows = [];
    // Combine snapshots and alerts into timeline
    const timeline = [];
    data.snapshots.forEach((s) => {
        timeline.push({
            date: s.timestamp,
            rootScore: s.rootScore,
            rootStatus: s.rootStatus,
            metricId: '',
            severity: '',
            summary: ''
        });
    });
    data.alerts.forEach((a) => {
        timeline.push({
            date: a.createdAt,
            rootScore: a.score,
            rootStatus: '',
            metricId: a.metricId,
            severity: a.severity,
            summary: a.aiSummary
        });
    });
    timeline.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    rows.push(headers.join(','));
    timeline.forEach(item => {
        const row = [
            item.date,
            item.rootScore || '',
            item.rootStatus || '',
            item.metricId || '',
            item.severity || '',
            `"${item.summary || ''}"` // Quote text fields
        ];
        rows.push(row.join(','));
    });
    return rows.join('\n');
}
exports.default = router;
//# sourceMappingURL=reports.js.map