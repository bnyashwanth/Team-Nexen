import express, { Request, Response } from 'express'
import { supabase } from '../lib/supabase'

const router = express.Router()

// POST /api/agent - AI Agent Chat
router.post('/', async (req: Request, res: Response) => {
  try {
    const { message, contextNode, contextData } = req.body

    if (!message) {
      return res.status(400).json({ error: 'Message is required' })
    }

    // Build prompt for LLM
    const prompt = buildPrompt(message, contextNode, contextData)

    // Mock LLM response (replace with actual API call)
    const agentResponse = getMockResponse(prompt)

    // Log the interaction
    const { error: insertError } = await supabase
      .from('agent_logs')
      .insert({
        user_id: (req as any).user?.userId,
        user_message: message,
        agent_response: agentResponse,
        context_node: contextNode || 'general',
        tokens_used: estimateTokens(prompt + agentResponse)
      })

    if (insertError) {
      console.warn('Failed to log agent interaction:', insertError)
    }

    res.json({
      response: agentResponse,
      contextNode,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Agent API error:', error)
    res.status(500).json({ error: 'Failed to process agent request' })
  }
})

// GET /api/agent/history - Get user's agent conversation history
router.get('/history', async (req: Request, res: Response) => {
  try {
    const { limit = 50 } = req.query

    const { data: history, error } = await supabase
      .from('agent_logs')
      .select('*')
      .eq('user_id', (req as any).user?.userId)
      .order('created_at', { ascending: false })
      .limit(parseInt(limit as string))

    if (error) {
      console.error('Agent history query error:', error)
      return res.status(500).json({ error: 'Failed to fetch history' })
    }

    res.json({ history: history || [] })

  } catch (error) {
    console.error('Agent history error:', error)
    res.status(500).json({ error: 'Failed to fetch history' })
  }
})

// Helper function to build LLM prompt
function buildPrompt(message: string, contextNode?: string, contextData?: any): string {
  const systemPrompt = `You are a Supply Chain Expert analyzing a Metric Tree dashboard. 
The user has identified a critical node that needs analysis. 
Analyze the provided context and give specific, actionable recommendations.
Be concise and focus on operational fixes.`

  const contextInfo = contextData ? `
Current Context:
- Metric: ${contextData.metric || contextNode}
- Score: ${contextData.score}%
- Status: ${contextData.status}
- Warehouse: ${contextData.warehouseId}
${contextData.errorCode ? `- Error Code: ${contextData.errorCode}` : ''}
${contextData.avgTime ? `- Average Time: ${contextData.avgTime}` : ''}
` : ''

  const fullPrompt = `${systemPrompt}

${contextInfo}

User Question: ${message}

Provide:
1. Root cause analysis
2. 2-3 specific actionable steps
3. Estimated impact if not fixed`

  return fullPrompt
}

// Mock response generator (replace with actual LLM API call)
function getMockResponse(prompt: string): string {
  if (prompt.includes('label') || prompt.includes('Label')) {
    return `I traced the failure path through your metric tree. The root cause is **Label Generation (5%)** inside Warehouse Processing (18%).

**Why:** Error logs embedded in the snapshot show a 401 Unauthorized from the North Zone Courier API — the API key expired at 09:00 AM today, causing label generation to time out for all North Zone orders.

**3 Fixes:**
1. **Rotate the North Zone courier API key immediately** in your courier dashboard.
2. **Set up API key expiry alerts** 7 days before expiry — add to your DevOps runbook.
3. **Implement a fallback label generation queue** that retries failed jobs every 15 mins.

**Impact:** ~340+ orders delayed. If not fixed within 2 hours, SLA breach triggers penalties.`
  }

  if (prompt.includes('delivery') || prompt.includes('otd') || prompt.includes('On-Time')) {
    return `The On-Time Delivery metric is at **45% (CRITICAL)** — well below the 70% threshold.

**Root Cause Analysis:**
Using the metric tree hierarchy: OTD depends on Warehouse Processing (weight: 55%) and Transit Time (weight: 45%).
- Transit Time is healthy at 95% ✓
- Warehouse Processing is CRITICAL at 18% ✗
  - Picking (98%) ✓ and Packing (96%) ✓ are fine
  - **Label Generation (5%) is the root cause** — 401_UNAUTHORIZED error from North Zone courier API

**Hierarchical vs Flat Insight:** Flat reporting would show OTD is low but wouldn't trace the path to Label Generation. The metric tree pinpoints the exact leaf node causing the cascade.

**Actions:**
1. Fix courier API authentication (North Zone)
2. Monitor WPT recovery in real-time
3. OTD will auto-recover once labels resume`
  }

  if (prompt.includes('poi') || prompt.includes('Perfect Order') || prompt.includes('67')) {
    return `**Perfect Order Index: 67% (CRITICAL)**

The POI score is calculated as:
poi = (otd × 0.60) + (oa × 0.25) + (dfr × 0.15)
    = (45 × 0.60) + (99 × 0.25) + (99.5 × 0.15)
    = 27 + 24.75 + 14.93 = **66.7% ≈ 67%**

**Root Cause Path:** POI → OTD (45%) → WPT (18%) → Label Generation (5%)

Order Accuracy (99%) and Damage Free Rate (99.5%) are both healthy. The entire POI degradation traces to a single leaf: Label Generation's API authentication failure.

**Key Insight:** This demonstrates the power of hierarchical analysis — one failing leaf node (Label Gen) cascades up through 3 levels to drop the top-level KPI by 26 points.`
  }

  if (prompt.includes('wpt') || prompt.includes('Warehouse Processing')) {
    return `**Warehouse Processing: 18% (CRITICAL)**

Breakdown by sub-metrics:
- Picking Time: 98% ✓ (healthy)
- Packing Speed: 96% ✓ (healthy)  
- Label Generation: 5% ✗ (CRITICAL) — avg processing time jumped from 30min to 6.2 hours

**Root Cause:** Label Generation is pulling the entire WPT score down. The 401_UNAUTHORIZED error code indicates the North Zone courier API key has expired, preventing label creation.

**Actions:**
1. Rotate courier API key immediately
2. Clear the backlog queue of ~340 pending labels
3. Set up automated API health checks every 5 minutes`
  }

  return `I've analyzed the supply chain metrics from the hierarchical metric tree.

**Metric Tree Analysis:**
The tree decomposes high-level KPIs into measurable sub-metrics across the warehouse lifecycle. This hierarchical approach identifies root causes that flat reporting would miss.

**Current Status:**
- Check the metric node scores and status indicators
- Critical (red) nodes indicate scores below threshold
- Click on any red node for detailed drill-down analysis

**Recommendation:** Focus on the lowest-scoring leaf nodes first, as they cascade upward through the weighted tree structure.`
}

// Simple token estimation
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4) // Rough estimate
}

export default router
