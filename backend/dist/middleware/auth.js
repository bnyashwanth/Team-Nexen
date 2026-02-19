"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = __importDefault(require("../models/User"));
const authMiddleware = async (req, res, next) => {
    try {
        // Get token from cookie
        const token = req.cookies?.token;
        if (!token) {
            return res.status(401).json({ error: 'Access denied. No token provided.' });
        }
        // Verify token
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || 'fallback_secret');
        // Verify user still exists in database
        const user = await User_1.default.findById(decoded.userId).select('-passwordHash');
        if (!user) {
            return res.status(401).json({ error: 'Token is valid but user not found.' });
        }
        // Attach user to request object
        req.user = {
            userId: user._id.toString(),
            role: user.role,
            name: user.name,
            email: user.email
        };
        next();
    }
    catch (error) {
        console.error('Auth middleware error:', error);
        return res.status(401).json({ error: 'Invalid token.' });
    }
};
exports.default = authMiddleware;
//# sourceMappingURL=auth.js.map