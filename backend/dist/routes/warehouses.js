"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const Warehouse_1 = __importDefault(require("../models/Warehouse"));
const router = express_1.default.Router();
// GET /api/warehouses - Get all active warehouses
router.get('/', async (req, res) => {
    try {
        const warehouses = await Warehouse_1.default.find({ isActive: true })
            .sort({ _id: 1 })
            .select('-__v');
        res.json({ warehouses });
    }
    catch (error) {
        console.error('Warehouses API error:', error);
        res.status(500).json({ error: 'Failed to fetch warehouses' });
    }
});
// GET /api/warehouses/:id - Get specific warehouse
router.get('/:id', async (req, res) => {
    try {
        const warehouse = await Warehouse_1.default.findById(req.params.id);
        if (!warehouse) {
            return res.status(404).json({ error: 'Warehouse not found' });
        }
        res.json({ warehouse });
    }
    catch (error) {
        console.error('Warehouse detail error:', error);
        res.status(500).json({ error: 'Failed to fetch warehouse' });
    }
});
// POST /api/warehouses - Create new warehouse (manager only)
router.post('/', async (req, res) => {
    try {
        if (req.user?.role !== 'manager') {
            return res.status(403).json({ error: 'Manager access required' });
        }
        const { name, zone, city } = req.body;
        if (!name || !zone || !city) {
            return res.status(400).json({ error: 'Name, zone, and city are required' });
        }
        const warehouse = new Warehouse_1.default({
            name,
            zone,
            city
        });
        await warehouse.save();
        res.status(201).json({ warehouse });
    }
    catch (error) {
        console.error('Create warehouse error:', error);
        res.status(500).json({ error: 'Failed to create warehouse' });
    }
});
exports.default = router;
//# sourceMappingURL=warehouses.js.map