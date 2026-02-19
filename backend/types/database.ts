// TypeScript types matching Supabase tables (replaces Mongoose schemas)

export interface DbUser {
    id: string
    email: string
    password_hash: string
    role: 'manager' | 'analyst'
    name: string
    last_login: string | null
    created_at: string
    updated_at: string
}

export interface DbWarehouse {
    id: string
    name: string
    zone: 'North' | 'South' | 'East' | 'West'
    city: string
    is_active: boolean
    created_at: string
    updated_at: string
}

export interface DbMetricSnapshot {
    id: string
    warehouse_id: string
    timestamp: string
    metric_tree: Record<string, any>
    root_score: number
    root_status: 'healthy' | 'warn' | 'critical'
    created_at: string
}

export interface DbMetricDefinition {
    id: string
    metric_id: string
    name: string
    parent_id: string | null
    impact_weight: number
    threshold_warn: number
    threshold_crit: number
    unit: '%' | 'hrs' | 'count'
    created_at: string
    updated_at: string
}

export interface DbAlert {
    id: string
    warehouse_id: string
    metric_id: string
    severity: 'warn' | 'critical'
    score: number
    ai_summary: string
    resolved_at: string | null
    created_at: string
    updated_at: string
}

export interface DbAgentLog {
    id: string
    user_id: string
    user_message: string
    agent_response: string
    context_node: string
    tokens_used: number
    created_at: string
}
