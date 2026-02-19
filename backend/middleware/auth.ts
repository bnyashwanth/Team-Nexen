import jwt from 'jsonwebtoken'
import { Request, Response } from 'express'
import { supabase } from '../lib/supabase'

interface JwtPayload {
  userId: string
  role: string
  email: string
  iat: number
  exp: number
}

const authMiddleware = async (req: Request, res: Response, next: Function) => {
  try {
    // Get token from cookie
    const token = req.cookies?.token

    if (!token) {
      return res.status(401).json({ error: 'Access denied. No token provided.' })
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret') as JwtPayload

    // Verify user still exists in database
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, name, role')
      .eq('id', decoded.userId)
      .single()

    if (error || !user) {
      return res.status(401).json({ error: 'Token is valid but user not found.' })
    }

    // Attach user to request object
    req.user = {
      userId: user.id,
      role: user.role,
      name: user.name,
      email: user.email
    }

    next()
  } catch (error) {
    console.error('Auth middleware error:', error)
    return res.status(401).json({ error: 'Invalid token.' })
  }
}

export default authMiddleware
