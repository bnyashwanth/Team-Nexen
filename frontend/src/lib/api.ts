// API configuration for Express.js backend
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'

// Type definitions for API responses
export interface User {
  _id: string
  email: string
  name: string
  role: 'manager' | 'analyst'
  lastLogin?: string
  createdAt: string
}

export interface Warehouse {
  id: string
  _id: string
  name: string
  zone: 'North' | 'South' | 'East' | 'West'
  city: string
  isActive: boolean
}

export interface MetricSnapshot {
  warehouseId: string
  timestamp: string
  metricTree: Record<string, any>
  rootScore: number
  rootStatus: 'healthy' | 'warn' | 'critical'
}

export interface MetricData {
  score: number
  status: 'healthy' | 'warn' | 'critical'
  metricId?: string
  warehouseId?: string
  avgTime?: string
  target?: string
  errorCode?: string
  affectedZone?: string
  impactWeight?: number
}

export interface TrendData {
  date: string
  score: number
}

export interface AgentResponse {
  response: string
  contextNode?: string
  timestamp: string
}

export interface ApiResponse<T> {
  data?: T
  error?: string
  message?: string
}

// Helper to wrap backend responses into our ApiResponse shape
async function handleResponse<T>(response: Response): Promise<ApiResponse<T>> {
  const json = await response.json()
  if (!response.ok) {
    return { error: json.error || json.message || 'Request failed' }
  }
  return { data: json }
}

// API client for backend communication
export const apiClient = {
  // Auth endpoints
  login: async (credentials: { email: string; password: string }): Promise<ApiResponse<{ user: User; message: string }>> => {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(credentials)
    })
    return handleResponse(response)
  },

  logout: async (): Promise<ApiResponse<{ message: string }>> => {
    const response = await fetch(`${API_BASE_URL}/auth/logout`, {
      method: 'POST',
      credentials: 'include'
    })
    return handleResponse(response)
  },

  getMe: async (): Promise<ApiResponse<{ user: User }>> => {
    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      credentials: 'include'
    })
    return handleResponse(response)
  },

  signup: async (data: { name: string; email: string; password: string }): Promise<ApiResponse<{ user: User; message: string }>> => {
    const response = await fetch(`${API_BASE_URL}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data)
    })
    return handleResponse(response)
  },

  // Tree endpoints
  getTree: async (warehouseId?: string): Promise<ApiResponse<{ snapshots: MetricSnapshot[]; warehouses: Warehouse[] }>> => {
    const url = warehouseId ? `${API_BASE_URL}/tree?warehouseId=${warehouseId}` : `${API_BASE_URL}/tree`
    const response = await fetch(url, {
      credentials: 'include'
    })
    return handleResponse(response)
  },

  getWarehouseTree: async (warehouseId: string, days: number = 7): Promise<ApiResponse<{ warehouse: Warehouse; snapshot: MetricSnapshot; historical: MetricSnapshot[]; metricDefinitions: any[] }>> => {
    const response = await fetch(`${API_BASE_URL}/tree/${warehouseId}?days=${days}`, {
      credentials: 'include'
    })
    return handleResponse(response)
  },

  getTrend: async (metricId: string, warehouseId: string, days: number = 7): Promise<ApiResponse<{ metricId: string; warehouseId: string; data: TrendData[]; period: string }>> => {
    const response = await fetch(`${API_BASE_URL}/tree/trend/${metricId}?warehouseId=${warehouseId}&days=${days}`, {
      credentials: 'include'
    })
    return handleResponse(response)
  },

  // Agent endpoints
  askAgent: async (message: string, contextNode?: string, contextData?: MetricData): Promise<ApiResponse<AgentResponse>> => {
    const response = await fetch(`${API_BASE_URL}/agent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ message, contextNode, contextData: contextData || undefined })
    })
    return handleResponse(response)
  },

  getAgentHistory: async (limit: number = 50): Promise<ApiResponse<{ history: any[] }>> => {
    const response = await fetch(`${API_BASE_URL}/agent/history?limit=${limit}`, {
      credentials: 'include'
    })
    return handleResponse(response)
  },

  // Warehouse endpoints
  getWarehouses: async (): Promise<ApiResponse<{ warehouses: Warehouse[] }>> => {
    const response = await fetch(`${API_BASE_URL}/warehouses`, {
      credentials: 'include'
    })
    return handleResponse(response)
  },

  // Report endpoints
  getWarehouseReport: async (warehouseId: string, days: number = 7): Promise<ApiResponse<any>> => {
    const response = await fetch(`${API_BASE_URL}/reports/warehouse/${warehouseId}?days=${days}`, {
      credentials: 'include'
    })
    return handleResponse(response)
  },

  exportWarehouse: async (warehouseId: string, format: string = 'json'): Promise<Response> => {
    const response = await fetch(`${API_BASE_URL}/reports/export/${warehouseId}?format=${format}`, {
      credentials: 'include'
    })
    return response
  },

  // Ingest endpoints
  seed: async (): Promise<ApiResponse<{ message: string }>> => {
    const response = await fetch(`${API_BASE_URL}/seed`, {
      method: 'POST',
      credentials: 'include'
    })
    return handleResponse(response)
  },

  // ML sync endpoint
  syncML: async (warehouseId: string): Promise<ApiResponse<{ message: string; predictions: Record<string, number> }>> => {
    const response = await fetch(`${API_BASE_URL}/ml/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ warehouse_id: warehouseId })
    })
    return handleResponse(response)
  },
}
