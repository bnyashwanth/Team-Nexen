"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const MetricSnapshot_1 = __importDefault(require("../models/MetricSnapshot"));
const Warehouse_1 = __importDefault(require("../models/Warehouse"));
const MetricDefinition_1 = __importDefault(require("../models/MetricDefinition"));
const router = express_1.default.Router();
// Helper function to enrich metric tree with definitions
function enrichMetricTree(tree, metricMap) {
    if (!tree || typeof tree !== 'object')
        return tree;
    const enriched = {};
    for (const [key, value] of Object.entries(tree)) {
        enriched[key] = value;
        if (metricMap.has(key)) {
            enriched._definition = metricMap.get(key);
        }
    }
    return enriched;
}
// GET /api/tree - Get latest metric tree for all warehouses
router.get('/', async (req, res) => {
    try {
        const { warehouseId } = req.query;
        // Get warehouses for filter dropdown
        const warehouses = await Warehouse_1.default.find({ isActive: true }).sort({ _id: 1 }).select('-__v');
        // Build query
        const query = {};
        if (warehouseId) {
            query.warehouseId = warehouseId;
        }
        // Get latest snapshot per warehouse
        const snapshots = await MetricSnapshot_1.default.aggregate([
            { $match: query },
            { $sort: { timestamp: -1 } },
            { $group: {
                    _id: '$warehouseId',
                    latestSnapshot: { $first: '$$ROOT' }
                } },
            { $replaceRoot: { newRoot: '$latestSnapshot' } }
        ]);
        // Get metric definitions
        const metricDefs = await MetricDefinition_1.default.find({});
        const metricMap = new Map();
        metricDefs.forEach((def) => {
            metricMap.set(def.metricId, def);
        });
        // Enrich snapshots with metric definitions
        const enrichedSnapshots = snapshots.map((snapshot) => ({
            ...snapshot,
            metricTree: enrichMetricTree(snapshot.metricTree, metricMap)
        }));
        res.json({
            warehouses,
            snapshots: enrichedSnapshots,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        console.error('Tree API error:', error);
        res.status(500).json({ error: 'Failed to fetch metric tree' });
    }
});
// GET /api/tree/:warehouseId - Get tree for specific warehouse
router.get('/:warehouseId', async (req, res) => {
    try {
        const { warehouseId } = req.params;
        const { days = 7 } = req.query;
        const warehouse = await Warehouse_1.default.findById(warehouseId);
        if (!warehouse) {
            return res.status(404).json({ error: 'Warehouse not found' });
        }
        // Get latest snapshot
        const latestSnapshot = await MetricSnapshot_1.default
            .findOne({ warehouseId })
            .sort({ timestamp: -1 });
        if (!latestSnapshot) {
            return res.status(404).json({ error: 'No data found for warehouse' });
        }
        // Get historical data for trends
        const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
        const historicalData = await MetricSnapshot_1.default
            .find({
            warehouseId,
            timestamp: { $gte: startDate }
        })
            .sort({ timestamp: 1 });
        // Get metric definitions
        const metricDefs = await MetricDefinition_1.default.find({});
        res.json({
            warehouse,
            snapshot: latestSnapshot,
            historical: historicalData,
            metricDefinitions: metricDefs
        });
    }
    catch (error) {
        console.error('Warehouse tree error:', error);
        res.status(500).json({ error: 'Failed to fetch warehouse data' });
    }
});
// GET /api/tree/trend/:metricId - Get trend data for specific metric
router.get('/trend/:metricId', async (req, res) => {
    try {
        const { metricId } = req.params;
        const { warehouseId, days = 7 } = req.query;
        if (!warehouseId) {
            return res.status(400).json({ error: 'warehouseId is required' });
        }
        const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
        const trendData = await MetricSnapshot_1.default.aggregate([
            {
                $match: {
                    warehouseId,
                    timestamp: { $gte: startDate },
                    [`metricTree.${metricId}`]: { $exists: true }
                }
            },
            {
                $project: {
                    date: { $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } },
                    score: `$metricTree.${metricId}.score`,
                    timestamp: 1
                }
            },
            { $sort: { timestamp: 1 } }
        ]);
        res.json({
            metricId,
            warehouseId,
            data: trendData,
            period: `${days} days`
        });
    }
    catch (error) {
        console.error('Trend API error:', error);
        res.status(500).json({ error: 'Failed to fetch trend data' });
    }
});
exports.default = router;
//# sourceMappingURL=tree.js.map