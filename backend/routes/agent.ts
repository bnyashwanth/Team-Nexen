import express, { Request, Response } from 'express'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { supabase } from '../lib/supabase'

const router = express.Router()

// ── API Key rotation pool (free tier keys from team) ──
// Each key has separate quota — rotates to next key on 429 rate-limit
const API_KEYS = [
  process.env.GEMINI_API_KEY || '',
  'AIzaSyDTLyZ2t1nRKoqkOlohqRjvm3BskWltQLA',   // Ravi
  'AIzaSyCPDKx3PiVnUpq-27_is0zdXEksjUk-wxc',   // Ravi
  'AIzaSyAvKoUYZ0YHsP377El60oteMVfap44QHAU',   // Spoorthi
  'AIzaSyD38uBAEjwq1rbuhcsqJkRuFfxvyKLDf4I',   // Spoorthi
  'AIzaSyASbjjfaghzswxByqKkoJEUfsj5iAVtap4',   // Spoorthi
  'AIzaSyDqhWuPM3IN8xlCY9-rDErlW4PAZYxXmTs',   // Spoorthi
  'AIzaSyCjfSJNw5E6421Y2fTivEQ554lApwOZZDY',   // Yashwanth
  'AIzaSyCY5XF4o5lQwO-Lcz-HIeqje2Wzc-FRSB0',   // Yashwanth
  'AIzaSyDkVHHlyyWnkIWow-h1MrT3LJrems28mOA',   // Yashwanth
  'AIzaSyCxlfJQXdpcZ2xLl_KLzjspAH32iHlW9z0',   // Yashwanth
  'AIzaSyCMWtSGIFUe_2vrtoHx7lrqp-21awaOo1I',   // Yashwanth
  'AIzaSyDTF3lRkPF5mG5QAB4dYS5teRNPRkWnmwM',   // Yashwanth
].filter(k => k && k.length > 10)

let currentKeyIndex = 0

function getNextKey(): string {
  const key = API_KEYS[currentKeyIndex % API_KEYS.length]
  currentKeyIndex = (currentKeyIndex + 1) % API_KEYS.length
  return key
}

function isRateLimitError(err: any): boolean {
  const msg = err.message || ''
  return msg.includes('429') || msg.includes('quota') || msg.includes('Too Many Requests') || msg.includes('RESOURCE_EXHAUSTED')
}

// ── Generate content with automatic key rotation ──
async function generateWithKeyRotation(prompt: string): Promise<{ text: string; keyUsed: number }> {
  const totalKeys = API_KEYS.length
  let lastError: any = null

  for (let attempt = 0; attempt < totalKeys; attempt++) {
    const key = getNextKey()
    const keyIndex = (currentKeyIndex - 1 + totalKeys) % totalKeys
    try {
      const genAI = new GoogleGenerativeAI(key)
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })
      const result = await model.generateContent(prompt)
      const text = result.response.text()
      console.log(`✅ Generated response using key #${keyIndex + 1}/${totalKeys}`)
      return { text, keyUsed: keyIndex }
    } catch (err: any) {
      lastError = err
      if (isRateLimitError(err)) {
        console.warn(`⚠️ Key #${keyIndex + 1} rate-limited, rotating to next key...`)
        continue
      }
      throw err // non-rate-limit error, throw immediately
    }
  }
  throw lastError || new Error('All API keys exhausted')
}

// ── Stream content with automatic key rotation ──
async function streamWithKeyRotation(
  prompt: string,
  onChunk: (text: string) => void
): Promise<{ fullText: string; keyUsed: number }> {
  const totalKeys = API_KEYS.length
  let lastError: any = null

  for (let attempt = 0; attempt < totalKeys; attempt++) {
    const key = getNextKey()
    const keyIndex = (currentKeyIndex - 1 + totalKeys) % totalKeys
    try {
      const genAI = new GoogleGenerativeAI(key)
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })
      const result = await model.generateContentStream(prompt)
      let fullText = ''
      for await (const chunk of result.stream) {
        const text = chunk.text()
        if (text) {
          fullText += text
          onChunk(text)
        }
      }
      console.log(`✅ Streamed response using key #${keyIndex + 1}/${totalKeys}`)
      return { fullText, keyUsed: keyIndex }
    } catch (err: any) {
      lastError = err
      if (isRateLimitError(err)) {
        console.warn(`⚠️ Key #${keyIndex + 1} rate-limited (stream), rotating to next key...`)
        continue
      }
      throw err
    }
  }
  throw lastError || new Error('All API keys exhausted')
}

// ── POST /api/agent — Non-streaming AI response ──
router.post('/', async (req: Request, res: Response) => {
  try {
    const { message, contextNode, contextData } = req.body

    if (!message) {
      return res.status(400).json({ error: 'Message is required' })
    }

    const prompt = buildPrompt(message, contextNode, contextData)
    const { text: agentResponse } = await generateWithKeyRotation(prompt)

    // Log interaction
    supabase
      .from('agent_logs')
      .insert({
        user_id: (req as any).user?.userId,
        user_message: message,
        agent_response: agentResponse,
        context_node: contextNode || 'general',
        tokens_used: Math.ceil((prompt.length + agentResponse.length) / 4)
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
    const userMsg = isRateLimitError(error)
      ? 'All API keys are currently rate-limited. Please wait 1-2 minutes and try again.'
      : error.message || 'Failed to process request'
    res.status(500).json({ error: userMsg })
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

// ── Prompt builder ──
function buildPrompt(message: string, contextNode?: string, contextData?: any): string {
  const systemPrompt = `You are an expert Supply Chain Analyst AI for "Nexen", a logistics dashboard.
Your goal is to analyze metric tree data and provide actionable operational insights.
Be concise, professional, and focus on root cause analysis.
If a metric is Critical (<50%) or Warning (<90%), explain WHY based on the data hierarchy.

Hierarchy:
POI (Perfect Order Index) depends on:
  - OTD (On-Time Delivery)
  - OA (Order Accuracy)
  - DFR (Damage Free Rate)

OTD depends on:
  - WPT (Warehouse Processing Time)
  - Transit Time

WPT depends on:
  - Picking Time
  - Label Generation
  - Packing Speed`

  const contextInfo = contextData ? `
Current Context:
- Metric: ${contextData.metric || contextNode}
- Score: ${contextData.score}%
- Status: ${contextData.status}
- Warehouse: ${contextData.warehouseId}
${contextData.errorCode ? `- Error Code: ${contextData.errorCode}` : ''}
${contextData.avgTime ? `- Avg Time: ${contextData.avgTime}` : ''}
${contextData.impactWeight ? `- Impact Weight: ${(contextData.impactWeight * 100).toFixed(0)}%` : ''}
` : ''

  return `${systemPrompt}

${contextInfo}

User Question: ${message}

Provide:
1. Analysis of the situation
2. Root cause (if identifiable)
3. 2-3 specific recommendations`
}

// ── POST /api/agent/chat — Streaming AI Chat via SSE with key rotation ──
router.post('/chat', async (req: Request, res: Response) => {
  try {
    const { message, contextNode, contextData } = req.body

    if (!message) {
      return res.status(400).json({ error: 'Message is required' })
    }

    const prompt = buildPrompt(message, contextNode, contextData)

    // Set SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    })

    let fullResponse = ''

    try {
      // Stream with automatic key rotation
      const { fullText } = await streamWithKeyRotation(prompt, (chunkText) => {
        res.write(`data: ${JSON.stringify({ type: 'chunk', content: chunkText })}\n\n`)
      })
      fullResponse = fullText
    } catch (streamError: any) {
      console.error('All streaming keys failed, trying non-streaming:', streamError.message)
      // Fallback: non-streaming with key rotation
      try {
        const { text } = await generateWithKeyRotation(prompt)
        fullResponse = text
        res.write(`data: ${JSON.stringify({ type: 'chunk', content: fullResponse })}\n\n`)
      } catch (fallbackError: any) {
        console.error('All generation attempts failed:', fallbackError.message)
        const userMessage = isRateLimitError(fallbackError)
          ? '⏳ All API keys are currently rate-limited. Please wait 1-2 minutes and try again.'
          : `AI generation failed: ${fallbackError.message || 'Unknown error'}`
        res.write(`data: ${JSON.stringify({ type: 'error', content: userMessage })}\n\n`)
        res.end()
        return
      }
    }

    // Send completion event
    res.write(`data: ${JSON.stringify({ type: 'done', content: fullResponse })}\n\n`)

    // Log interaction (non-blocking)
    supabase
      .from('agent_logs')
      .insert({
        user_id: (req as any).user?.userId,
        user_message: message,
        agent_response: fullResponse,
        context_node: contextNode || 'chatbot',
        tokens_used: Math.ceil((prompt.length + fullResponse.length) / 4)
      })
      .then(({ error }) => {
        if (error) console.warn('Failed to log chat interaction:', error.message)
      })

    res.end()
  } catch (error: any) {
    console.error('Streaming chat error:', error.message || error)
    if (res.headersSent) {
      const userMessage = isRateLimitError(error)
        ? '⏳ All API keys are currently rate-limited. Please wait 1-2 minutes and try again.'
        : `Error: ${error.message || 'An error occurred during generation.'}`
      res.write(`data: ${JSON.stringify({ type: 'error', content: userMessage })}\n\n`)
      res.end()
    } else {
      res.status(500).json({ error: 'Failed to process chat request' })
    }
  }
})

export default router
