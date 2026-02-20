import dotenv from 'dotenv'
dotenv.config()

import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import cookieParser from 'cookie-parser'

// Import routes
import authRoutes from './routes/auth'
import treeRoutes from './routes/tree'
import agentRoutes from './routes/agent'
import warehouseRoutes from './routes/warehouses'
import reportRoutes from './routes/reports'
import ingestRoutes from './routes/ingest'
import seedRoutes from './routes/seed'
import adminRoutes from './routes/admin'
import productRoutes from './routes/product'
import mlRoutes from './routes/ml'

// Import middleware
import authMiddleware from './middleware/auth'

// Import Supabase client (validates connection)
import { supabase } from './lib/supabase'

const app = express()
const PORT = process.env.PORT || 5000

// Security middleware
app.use(helmet())

const allowedOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(',')
  : ['http://localhost:3000', 'http://localhost:3001']

app.use(cors({
  origin: (origin, callback) => {
    // allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true)
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.'
      return callback(new Error(msg), false)
    }
    return callback(null, true)
  },
  credentials: true
}))

// Cookie parsing middleware (required for req.cookies)
app.use(cookieParser())

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
})
app.use('/api/', limiter)

// Body parsing middleware
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

  // Verify Supabase connection on startup
  ; (async () => {
    try {
      const { data, error } = await supabase.from('warehouses').select('id').limit(1)
      if (error) {
        console.error('❌ Supabase connection error:', error.message)
      } else {
        console.log('✅ Supabase connected')
      }
    } catch (err) {
      console.error('❌ Supabase connection error:', err)
    }
  })()

// Routes
app.use('/api/auth', authRoutes)
app.use('/api/tree', authMiddleware, treeRoutes)
app.use('/api/agent', authMiddleware, agentRoutes)
app.use('/api/warehouses', authMiddleware, warehouseRoutes)
app.use('/api/reports', authMiddleware, reportRoutes)
app.use('/api/ingest', authMiddleware, ingestRoutes)
app.use('/api/admin', authMiddleware, adminRoutes)
app.use('/api/admin/product', authMiddleware, productRoutes)
app.use('/api/seed', seedRoutes) // Public route
app.use('/api/ml', authMiddleware, mlRoutes)

// Health check
app.get('/api/health', async (req, res) => {
  const { error } = await supabase.from('warehouses').select('id').limit(1)
  res.json({
    status: error ? 'degraded' : 'OK',
    database: error ? 'disconnected' : 'connected',
    timestamp: new Date().toISOString()
  })
})

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack)
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  })
})

// 404 handler
app.use((req: express.Request, res: express.Response) => {
  res.status(404).json({ error: 'Route not found' })
})

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`)
  console.log(`📊 Dashboard: http://localhost:${PORT}/api/health`)
})

export default app
