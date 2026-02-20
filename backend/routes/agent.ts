import express, { Request, Response } from 'express'
import { supabase } from '../lib/supabase'

const router = express.Router()

// ── Rule-Based Logic ──

function getRuleBasedResponse(message: string, contextNode?: string, contextData?: any): string {
  const msgLower = message.toLowerCase()
  const metric = contextData?.metric || contextNode || 'unknown'
  const score = contextData?.score
  const status = contextData?.status

  // 1. Specific Metric Analysis
  if (score !== undefined) {
    if (msgLower.includes('why') || msgLower.includes('reason') || msgLower.includes('cause')) {
      if (score < 50) {
        return `The ${metric.toUpperCase()} score is critically low at ${score}%. This is likely due to upstream bottlenecks or recent operational failures. Immediate investigation into sub-component performance is recommended.`
      } else if (score < 90) {
        return `The ${metric.toUpperCase()} score is at warning level (${score}%). This indicates some inefficiencies. Check for minor delays or data inconsistencies.`
      } else {
        return `The ${metric.toUpperCase()} score is healthy at ${score}%. Operations are running smoothly.`
      }
    }

    if (msgLower.includes('improve') || msgLower.includes('fix') || msgLower.includes('recommend')) {
      if (score < 90) {
        return `To improve ${metric.toUpperCase()}, focus on optimizing workflow efficiency and reducing error rates in the dependent processes.`
      } else {
        return `Current performance for ${metric.toUpperCase()} is optimal. Maintain current operational standards.`
      }
    }

    return `The current status of ${metric.toUpperCase()} is ${status} with a score of ${score}%.`
  }

  // 2. General Queries
  if (msgLower.includes('hello') || msgLower.includes('hi')) {
    return "Hello! I am your Supply Chain Assistant. How can I help you with the metrics today?"
  }

  if (msgLower.includes('help')) {
    return "I can help you analyze metric performance, identify root causes for low scores, and suggest improvements. Try asking about a specific metric like POI or OTD."
  }

  // Fallback
  return `I can provide details on metric performance. Please select a specific node in the metric tree or ask about a specific metric.`
}

// ── POST /api/agent — Non-streaming Response ──
router.post('/', async (req: Request, res: Response) => {
  try {
    const { message, contextNode, contextData } = req.body

    if (!message) {
      return res.status(400).json({ error: 'Message is required' })
    }

    const agentResponse = getRuleBasedResponse(message, contextNode, contextData)

    // Log interaction
    supabase
      .from('agent_logs')
      .insert({
        user_id: (req as any).user?.userId,
        user_message: message,
        agent_response: agentResponse,
        context_node: contextNode || 'general',
        tokens_used: 0 // No tokens used for rule-based
      })
      .then(({ error }) => {
        if (error) console.warn('Failed to log agent interaction:', error.message)
      })

    res.json({
      response: agentResponse,
      contextNode,
      timestamp: new Date().toISOString()
    })

  } catch (error: any) {
    console.error('Agent API error:', error.message || error)
    res.status(500).json({ error: 'Failed to process request' })
  }
})

// ── GET /api/agent/history ──
router.get('/history', async (req: Request, res: Response) => {
  try {
    const { limit = 50 } = req.query
    const { data, error } = await supabase
      .from('agent_logs')
      .select('*')
      .eq('user_id', (req as any).user?.userId)
      .order('created_at', { ascending: false })
      .limit(parseInt(limit as string))

    if (error) throw error
    res.json({ history: data || [] })
  } catch (error) {
    console.error('Agent history error:', error)
    res.status(500).json({ error: 'Failed to fetch history' })
  }
})

// ── POST /api/agent/chat — Mock Streaming Response ──
router.post('/chat', async (req: Request, res: Response) => {
  try {
    const { message, contextNode, contextData } = req.body

    if (!message) {
      return res.status(400).json({ error: 'Message is required' })
    }

    const fullResponse = getRuleBasedResponse(message, contextNode, contextData)

    // Set SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    })

    // Simulate streaming by sending the whole response in one or two chunks
    res.write(`data: ${JSON.stringify({ type: 'chunk', content: fullResponse })}\n\n`)

    // Send completion event
    res.write(`data: ${JSON.stringify({ type: 'done', content: fullResponse })}\n\n`)

    // Log interaction
    supabase
      .from('agent_logs')
      .insert({
        user_id: (req as any).user?.userId,
        user_message: message,
        agent_response: fullResponse,
        context_node: contextNode || 'chatbot',
        tokens_used: 0
      })
      .then(({ error }) => {
        if (error) console.warn('Failed to log chat interaction:', error.message)
      })

    res.end()
  } catch (error: any) {
    console.error('Chat error:', error.message || error)
    if (res.headersSent) {
      res.write(`data: ${JSON.stringify({ type: 'error', content: 'An error occurred.' })}\n\n`)
      res.end()
    } else {
      res.status(500).json({ error: 'Failed to process chat request' })
    }
  }
})

export default router
