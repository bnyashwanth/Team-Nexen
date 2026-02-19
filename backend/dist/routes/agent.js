"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const AgentLog_1 = __importDefault(require("../models/AgentLog"));
const router = express_1.default.Router();
// POST /api/agent - AI Agent Chat
router.post('/', async (req, res) => {
    try {
        const { message, contextNode, contextData } = req.body;
        if (!message) {
            return res.status(400).json({ error: 'Message is required' });
        }
        // Build prompt for LLM
        const prompt = buildPrompt(message, contextNode, contextData);
        // Mock LLM response (replace with actual API call)
        const agentResponse = getMockResponse(prompt);
        // Log the interaction
        const agentLog = new AgentLog_1.default({
            userId: req.user?.userId,
            userMessage: message,
            agentResponse,
            contextNode: contextNode || 'general',
            tokensUsed: estimateTokens(prompt + agentResponse)
        });
        await agentLog.save();
        res.json({
            response: agentResponse,
            contextNode,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        console.error('Agent API error:', error);
        res.status(500).json({ error: 'Failed to process agent request' });
    }
});
// GET /api/agent/history - Get user's agent conversation history
router.get('/history', async (req, res) => {
    try {
        const { limit = 50 } = req.query;
        const history = await AgentLog_1.default.find({ userId: req.user?.userId })
            .sort({ createdAt: -1 })
            .limit(parseInt(limit))
            .select('-__v');
        res.json({ history });
    }
    catch (error) {
        console.error('Agent history error:', error);
        res.status(500).json({ error: 'Failed to fetch history' });
    }
});
// Helper function to build LLM prompt
function buildPrompt(message, contextNode, contextData) {
    const systemPrompt = `You are a Supply Chain Expert analyzing a Metric Tree dashboard. 
The user has identified a critical node that needs analysis. 
Analyze the provided context and give specific, actionable recommendations.
Be concise and focus on operational fixes.`;
    const contextInfo = contextData ? `
Current Context:
- Metric: ${contextData.metric || contextNode}
- Score: ${contextData.score}%
- Status: ${contextData.status}
- Warehouse: ${contextData.warehouseId}
${contextData.errorCode ? `- Error Code: ${contextData.errorCode}` : ''}
${contextData.avgTime ? `- Average Time: ${contextData.avgTime}` : ''}
` : '';
    const fullPrompt = `${systemPrompt}

${contextInfo}

User Question: ${message}

Provide:
1. Root cause analysis
2. 2-3 specific actionable steps
3. Estimated impact if not fixed`;
    return fullPrompt;
}
// Mock response generator (replace with actual LLM API call)
function getMockResponse(prompt) {
    if (prompt.includes('label') || prompt.includes('api')) {
        return `I've analyzed the Label Generation metric. The root cause appears to be an API authentication issue with the courier service.

**Root Cause:** API key expiration or authentication failure with external courier API

**Recommended Actions:**
1. Immediately rotate the courier API keys in your courier dashboard
2. Implement API key expiry alerts 7 days before expiration
3. Set up a fallback label generation queue that retries failed jobs every 15 minutes

**Impact:** This is affecting all outbound shipments and could cause significant delivery delays.`;
    }
    if (prompt.includes('delivery') || prompt.includes('otd')) {
        return `The On-Time Delivery metric is showing critical performance. Based on the metric tree analysis, this appears to be a multi-factor issue.

**Root Cause:** Combination of warehouse processing delays and transit time issues

**Recommended Actions:**
1. Optimize warehouse picking and packing processes
2. Review courier performance and consider backup providers
3. Implement real-time order tracking and exception handling

**Impact:** Current performance is affecting customer satisfaction and may incur penalty fees.`;
    }
    return `I've analyzed the supply chain metrics you've highlighted. The system shows performance degradation that requires immediate attention.

**Root Cause:** Process inefficiency in operational workflow

**Recommended Actions:**
1. Conduct immediate process review of the affected area
2. Implement performance monitoring and alerting
3. Consider temporary resource reallocation to address bottlenecks

**Impact:** Addressing this quickly will prevent further service level degradation.`;
}
// Simple token estimation
function estimateTokens(text) {
    return Math.ceil(text.length / 4); // Rough estimate
}
exports.default = router;
//# sourceMappingURL=agent.js.map