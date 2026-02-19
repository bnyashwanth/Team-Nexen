"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const MetricSnapshot_1 = __importDefault(require("../models/MetricSnapshot"));
const Warehouse_1 = __importDefault(require("../models/Warehouse"));
const router = express_1.default.Router();
// POST /api/ingest
router.post('/', async (req, res) => {
    try {
        const { warehouse_id, metric_id, score, orders_volume, staff_count } = req.body;
        // Validate required fields
        if (!warehouse_id || !metric_id || score === undefined || !orders_volume || !staff_count) {
            return res.status(400).json({ error: 'All fields are required' });
        }
        // Validate score range
        if (score < 0 || score > 100) {
            return res.status(400).json({ error: 'Score must be between 0 and 100' });
        }
        // Check if warehouse exists
        const warehouse = await Warehouse_1.default.findOne({ _id: warehouse_id });
        if (!warehouse) {
            return res.status(404).json({ error: 'Warehouse not found' });
        }
        // Create metric snapshot
        const snapshot = new MetricSnapshot_1.default({
            warehouseId: warehouse_id,
            timestamp: new Date(),
            metricTree: {
                id: metric_id,
                score: parseFloat(score),
                ordersVolume: parseInt(orders_volume),
                staffCount: parseInt(staff_count),
                status: score >= 80 ? 'healthy' : score >= 60 ? 'warn' : 'critical'
            },
            rootScore: parseFloat(score),
            rootStatus: score >= 80 ? 'healthy' : score >= 60 ? 'warn' : 'critical'
        });
        await snapshot.save();
        res.status(201).json({
            message: 'Data successfully ingested and analyzed',
            data: {
                warehouseId: warehouse_id,
                metricId: metric_id,
                score: parseFloat(score),
                status: snapshot.metricTree.status,
                timestamp: snapshot.timestamp
            }
        });
    }
    catch (error) {
        console.error('Ingest error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.default = router;
//# sourceMappingURL=ingest.js.map