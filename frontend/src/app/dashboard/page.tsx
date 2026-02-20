'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import MetricTree from '@/components/MetricTree'
import TrendChart from '@/components/TrendChart'
import AICopilotSidebar from '@/components/AICopilotSidebar'
import LogicAssistantWidget from '@/components/LogicAssistantWidget'
import Logo from '@/components/Logo'
import { apiClient, type User, type Warehouse, type MetricSnapshot } from '@/lib/api'
import { useNotifications } from '@/components/NotificationSystem'

// ═══════════════════════════════════
// Types
// ═══════════════════════════════════
type ActiveView = 'home' | 'metric-tree' | 'alerts' | 'charts' | 'data-table'

interface Alert {
  id: string
  title: string
  description: string
  status: 'critical' | 'warn' | 'healthy'
  action?: string
  timestamp: Date
}

// ═══════════════════════════════════
// SVG Icon Components
// ═══════════════════════════════════
const icons = {
  home: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  ),
  tree: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="18" cy="18" r="3" /><circle cx="6" cy="6" r="3" />
      <path d="M13 6h3a2 2 0 012 2v7" /><line x1="6" y1="9" x2="6" y2="21" />
    </svg>
  ),
  alert: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 01-3.46 0" />
    </svg>
  ),
  chart: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  ),
  table: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <line x1="3" y1="9" x2="21" y2="9" /><line x1="3" y1="15" x2="21" y2="15" />
      <line x1="9" y1="3" x2="9" y2="21" />
    </svg>
  ),
  settings: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
    </svg>
  ),
  menu: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  ),
  logout: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  ),
  download: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  ),
  sync: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M23 4v6h-6" /><path d="M1 20v-6h6" />
      <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
    </svg>
  ),
  back: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
    </svg>
  ),
}

// ═══════════════════════════════════
// Sidebar Component (Dark)
// ═══════════════════════════════════
function Sidebar({
  collapsed, onToggle, user, warehouses, selectedWarehouse,
  onWarehouseChange, onLogout, activeView, onNavigate,
}: {
  collapsed: boolean; onToggle: () => void; user: User | null
  warehouses: Warehouse[]; selectedWarehouse: string
  onWarehouseChange: (id: string) => void; onLogout: () => void
  activeView: ActiveView; onNavigate: (view: ActiveView) => void
}) {
  const navItems: { view: ActiveView; icon: React.ReactNode; label: string }[] = [
    { view: 'home', icon: icons.home, label: 'Dashboard' },
    { view: 'metric-tree', icon: icons.tree, label: 'Metric Tree' },
    { view: 'alerts', icon: icons.alert, label: 'Alerts' },
    { view: 'charts', icon: icons.chart, label: 'Charts' },
    { view: 'data-table', icon: icons.table, label: 'Data Table' },
  ]

  return (
    <aside className={`fixed left-0 top-0 h-full z-40 transition-all duration-300 ease-in-out glass-sidebar flex flex-col
      ${collapsed ? 'w-17' : 'w-65'}`}>

      {/* Logo + Toggle */}
      <div className="flex items-center h-16 px-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        <button onClick={onToggle}
          className="w-9 h-9 flex items-center justify-center rounded-lg transition-all duration-200 hover:bg-white/5"
          style={{ color: 'var(--text-secondary)' }}>
          {icons.menu}
        </button>
        {!collapsed && (
          <div className="flex items-center gap-2">
            <Logo size="sm" className="shrink-0" />
            <span className="text-lg font-bold gradient-text tracking-tight">Nexen</span>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 px-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <button key={item.view} onClick={() => onNavigate(item.view)}
            className={`w-full flex items-center gap-3 rounded-xl transition-all duration-200
              ${collapsed ? 'justify-center px-2 py-3' : 'px-3 py-2.5'}
              ${activeView === item.view
                ? 'text-indigo-400 font-medium'
                : 'hover:bg-white/5'}`}
            style={{
              background: activeView === item.view ? 'rgba(99, 102, 241, 0.1)' : undefined,
              color: activeView === item.view ? '#818cf8' : 'var(--text-secondary)',
              ...(activeView === item.view ? { boxShadow: 'inset 0 0 0 1px rgba(99,102,241,0.15)' } : {}),
            }}
            title={collapsed ? item.label : undefined}>
            <span className="shrink-0">{item.icon}</span>
            {!collapsed && <span className="text-sm">{item.label}</span>}
          </button>
        ))}

        {!collapsed && <div className="h-px my-3" style={{ background: 'var(--border-subtle)' }} />}

        <button onClick={() => window.location.href = '/admin'}
          className={`w-full flex items-center gap-3 rounded-xl transition-all duration-200 hover:bg-white/5
            ${collapsed ? 'justify-center px-2 py-3' : 'px-3 py-2.5'}`}
          style={{ color: 'var(--text-muted)' }}
          title={collapsed ? 'Admin Portal' : undefined}>
          <span className="shrink-0">{icons.settings}</span>
          {!collapsed && <span className="text-sm">Admin Portal</span>}
        </button>
      </nav>

      {/* Warehouse Selector */}
      {!collapsed && warehouses.length > 0 && (
        <div className="px-4 py-3" style={{ borderTop: '1px solid var(--border-subtle)' }}>
          <label className="text-[11px] font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
            Warehouse
          </label>
          <select
            value={selectedWarehouse}
            onChange={(e) => onWarehouseChange(e.target.value)}
            className="mt-1.5 w-full text-sm rounded-lg px-3 py-2 transition-all outline-none bg-white border border-gray-200 text-gray-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          >
            {warehouses.map((w) => (
              <option key={w.id || w._id} value={w.id || w._id}>
                {w.name} ({w.zone})
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Profile */}
      <div className={`p-3 ${collapsed ? 'flex justify-center' : ''}`}
        style={{ borderTop: '1px solid var(--border-subtle)' }}>
        {collapsed ? (
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-semibold"
            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
            {user?.name?.charAt(0)?.toUpperCase() || 'U'}
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm shrink-0"
              style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{user?.name || 'User'}</p>
              <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{user?.email}</p>
            </div>
            <button onClick={onLogout}
              className="p-1.5 rounded-lg transition-all hover:bg-red-500/10"
              style={{ color: 'var(--text-muted)' }}
              title="Logout">
              {icons.logout}
            </button>
          </div>
        )}
      </div>
    </aside>
  )
}

// ═══════════════════════════════════
// Dashboard Cards (Glass)
// ═══════════════════════════════════
function DashboardCard({ icon, title, value, subtitle, status, color, onClick, delay }: {
  icon: React.ReactNode; title: string; value: string; subtitle: string
  status?: string; color: string; onClick: () => void; delay?: number
}) {
  const accentMap: Record<string, { gradient: string; glow: string; text: string }> = {
    indigo: { gradient: 'linear-gradient(135deg, #6366f1, #818cf8)', glow: 'rgba(99,102,241,0.15)', text: '#818cf8' },
    emerald: { gradient: 'linear-gradient(135deg, #10b981, #34d399)', glow: 'rgba(16,185,129,0.15)', text: '#34d399' },
    amber: { gradient: 'linear-gradient(135deg, #f59e0b, #fbbf24)', glow: 'rgba(245,158,11,0.15)', text: '#fbbf24' },
    violet: { gradient: 'linear-gradient(135deg, #8b5cf6, #a78bfa)', glow: 'rgba(139,92,246,0.15)', text: '#a78bfa' },
  }
  const accent = accentMap[color] || accentMap.indigo

  return (
    <button
      onClick={onClick}
      className="group relative w-full p-6 text-left rounded-2xl transition-all duration-300 hover:scale-[1.02] hover:shadow-xl"
      style={{
        background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
        border: '1px solid rgba(100, 116, 139, 0.1)',
        boxShadow: '0 4px 20px rgba(100, 116, 139, 0.08), 0 1px 4px rgba(0, 0, 0, 0.05)',
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white text-lg"
            style={{
              background: accent.gradient,
              boxShadow: `0 4px 12px ${accent.glow}`,
            }}>
            {icon}
          </div>
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
              {title}
            </h3>
          </div>
        </div>
        {status && (
          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${status === 'healthy' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' :
              status === 'warn' ? 'bg-amber-50 text-amber-600 border border-amber-200' :
                'bg-red-50 text-red-600 border border-red-200'
            }`}>
            {status === 'healthy' ? 'Healthy' : status === 'warn' ? 'Warning' : 'Critical'}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="space-y-2">
        <p className="text-3xl font-bold" style={{ color: accent.text }}>
          {value}
        </p>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          {subtitle}
        </p>
      </div>

      {/* Hover Effect Overlay */}
      <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        style={{
          background: 'linear-gradient(135deg, rgba(100, 116, 139, 0.02) 0%, rgba(71, 85, 105, 0.02) 100%)',
          border: '1px solid rgba(100, 116, 139, 0.2)',
        }} />

      {/* Bottom Accent Line */}
      <div className="absolute bottom-0 left-0 right-0 h-1 rounded-b-2xl opacity-0 group-hover:opacity-100 transition-all duration-300"
        style={{
          background: accent.gradient,
          height: '3px',
        }} />
    </button>
  )
}

// ═══════════════════════════════════
// Alerts View (Dark)
// ═══════════════════════════════════
function AlertsView({ alerts }: { alerts: Alert[] }) {
  const sortedAlerts = [...alerts].sort((a, b) => {
    const order: Record<string, number> = { critical: 0, warn: 1, healthy: 2 }
    return (order[a.status] || 999) - (order[b.status] || 999)
  })

  return (
    <div className="space-y-4">
      {sortedAlerts.length === 0 ? (
        <div className="text-center py-12 rounded-2xl"
          style={{
            background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
            border: '1px solid rgba(30, 64, 175, 0.1)',
          }}>
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center text-2xl"
            style={{
              background: 'linear-gradient(135deg, #10b981, #34d399)',
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.15)',
            }}>
            ✅
          </div>
          <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>All Systems Operational</h3>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No active alerts at this time.</p>
        </div>
      ) : (
        sortedAlerts.map((alert) => (
          <div
            key={alert.id}
            className="p-5 rounded-2xl transition-all duration-300 hover:shadow-lg border"
            style={{
              background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
              borderColor: alert.status === 'critical' ? 'rgba(220, 38, 38, 0.2)' :
                alert.status === 'warn' ? 'rgba(217, 119, 6, 0.2)' :
                  'rgba(16, 185, 129, 0.2)',
              boxShadow: '0 2px 8px rgba(100, 116, 139, 0.05)',
            }}
          >
            <div className="flex items-start gap-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white text-lg shrink-0 ${alert.status === 'critical' ? 'bg-linear-to-br from-red-500 to-red-600' :
                  alert.status === 'warn' ? 'bg-linear-to-br from-amber-500 to-amber-600' :
                    'bg-linear-to-br from-emerald-500 to-emerald-600'
                }`}>
                {alert.status === 'critical' ? '⚠️' :
                  alert.status === 'warn' ? '⚡' : '✓'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-semibold text-base" style={{ color: 'var(--text-primary)' }}>
                    {alert.title}
                  </h4>
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold border ${alert.status === 'critical' ? 'bg-red-50 text-red-600 border-red-200' :
                      alert.status === 'warn' ? 'bg-amber-50 text-amber-600 border-amber-200' :
                        'bg-emerald-50 text-emerald-600 border-emerald-200'
                    }`}>
                    {alert.status.toUpperCase()}
                  </span>
                </div>
                <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>
                  {alert.description}
                </p>
                <div className="flex items-center justify-between">
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {alert.timestamp.toLocaleString()}
                  </p>
                  {alert.action && (
                    <button className="text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
                      style={{
                        background: 'rgba(30, 64, 175, 0.1)',
                        color: '#1e40af',
                        border: '1px solid rgba(30, 64, 175, 0.2)',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(30, 64, 175, 0.15)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(30, 64, 175, 0.1)'
                      }}>
                      {alert.action}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  )
}

// ═══════════════════════════════════
// Charts View (Dark)
// ═══════════════════════════════════
function ChartsView({ warehouseId }: { warehouseId: string }) {
  const metrics = ['poi', 'otd', 'wpt', 'oa', 'dfr', 'tt', 'pick', 'pack']
  const metricNames: Record<string, string> = {
    poi: 'Perfect Order Index', otd: 'On-Time Delivery', wpt: 'Warehouse Processing',
    oa: 'Order Accuracy', dfr: 'Damage Free Rate', tt: 'Transit Time',
    pick: 'Picking Time', pack: 'Packing Speed',
  }
  const [selectedMetric, setSelectedMetric] = useState('poi')

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-wrap gap-2">
        {metrics.map((m) => (
          <button key={m} onClick={() => setSelectedMetric(m)}
            className="px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200"
            style={{
              background: selectedMetric === m ? 'rgba(99,102,241,0.15)' : 'var(--bg-card)',
              color: selectedMetric === m ? '#818cf8' : 'var(--text-secondary)',
              border: `1px solid ${selectedMetric === m ? 'rgba(99,102,241,0.3)' : 'var(--border-subtle)'}`,
              boxShadow: selectedMetric === m ? '0 0 12px rgba(99,102,241,0.1)' : 'none',
            }}>
            {metricNames[m] || m.toUpperCase()}
          </button>
        ))}
      </div>
      <div className="glass-card p-6">
        <TrendChart metricId={selectedMetric} warehouseId={warehouseId} days={14} />
      </div>
    </div>
  )
}

// ═══════════════════════════════════
// Data Table View (Dark)
// ═══════════════════════════════════
function DataTableView({ metrics }: { metrics: MetricSnapshot[] }) {
  const metricNames: Record<string, string> = {
    poi: 'Perfect Order Index', otd: 'On-Time Delivery', wpt: 'Warehouse Processing',
    oa: 'Order Accuracy', dfr: 'Damage Free Rate', tt: 'Transit Time',
    pick: 'Picking Time', label: 'Label Generation', pack: 'Packing Speed',
  }

  if (metrics.length === 0) {
    return (
      <div className="text-center py-16 animate-fade-in" style={{ color: 'var(--text-muted)' }}>
        <div className="text-5xl mb-3">📭</div>
        <p className="text-lg font-medium" style={{ color: 'var(--text-secondary)' }}>No data available</p>
        <p className="text-sm">Select a warehouse to view metric data</p>
      </div>
    )
  }

  const rows: { metric: string; score: number; status: string; timestamp: string }[] = []
  metrics.forEach((snapshot) => {
    if (snapshot.metricTree && typeof snapshot.metricTree === 'object') {
      Object.entries(snapshot.metricTree).forEach(([key, val]: [string, any]) => {
        if (val && typeof val === 'object' && 'score' in val) {
          rows.push({
            metric: metricNames[key] || key.toUpperCase(),
            score: val.score ?? 0,
            status: val.status || 'healthy',
            timestamp: snapshot.timestamp ? new Date(snapshot.timestamp).toLocaleDateString() : '-',
          })
        }
      })
    }
  })

  return (
    <div className="glass-card overflow-hidden animate-fade-in">
      <div className="overflow-x-auto">
        <table className="w-full text-sm table-dark">
          <thead>
            <tr>
              <th className="text-left">Metric</th>
              <th className="text-left">Score</th>
              <th className="text-left">Status</th>
              <th className="text-left">Date</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i}>
                <td className="font-medium" style={{ color: 'var(--text-primary)' }}>{row.metric}</td>
                <td>
                  <div className="flex items-center gap-3">
                    <div className="w-24 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border-subtle)' }}>
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${Math.min(row.score, 100)}%`,
                          background: row.score >= 80 ? '#10b981' : row.score >= 60 ? '#f59e0b' : '#ef4444',
                        }} />
                    </div>
                    <span className="font-mono text-xs" style={{ color: 'var(--text-secondary)' }}>{row.score.toFixed(1)}</span>
                  </div>
                </td>
                <td>
                  <span className={`inline-flex px-2 py-0.5 text-[11px] font-semibold rounded-full uppercase tracking-wider
                    ${row.status === 'healthy' ? 'bg-emerald-500/10 text-emerald-400' :
                      row.status === 'warn' ? 'bg-amber-500/10 text-amber-400' :
                        'bg-red-500/10 text-red-400'}`}>
                    {row.status}
                  </span>
                </td>
                <td style={{ color: 'var(--text-muted)' }}>{row.timestamp}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length > 0 && (
        <div className="px-4 py-3 text-xs" style={{ borderTop: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
          Showing {rows.length} metrics
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════
// Helpers
// ═══════════════════════════════════
function getMetricFromSnapshots(snapshots: MetricSnapshot[], metricId: string): { score: number; status: string } {
  for (const snap of snapshots) {
    const tree = snap.metricTree
    if (tree && typeof tree === 'object') {
      if (tree[metricId] && typeof tree[metricId] === 'object' && 'score' in tree[metricId]) {
        return { score: tree[metricId].score, status: tree[metricId].status || 'healthy' }
      }
      if (tree.id === metricId && 'score' in tree) {
        return { score: tree.score as number, status: (tree.status as string) || 'healthy' }
      }
    }
  }
  return { score: 0, status: 'healthy' }
}

function generateAlerts(metrics: MetricSnapshot[]): Alert[] {
  const alerts: Alert[] = []
  const metricNames: Record<string, string> = {
    poi: 'Perfect Order Index', otd: 'On-Time Delivery', wpt: 'Warehouse Processing',
    oa: 'Order Accuracy', dfr: 'Damage Free Rate', tt: 'Transit Time',
    pick: 'Picking Time', label: 'Label Generation', pack: 'Packing Speed',
  }

  metrics.forEach((snapshot) => {
    if (snapshot.metricTree && typeof snapshot.metricTree === 'object') {
      Object.entries(snapshot.metricTree).forEach(([key, val]: [string, any]) => {
        if (val && typeof val === 'object' && val.status && val.status !== 'healthy') {
          alerts.push({
            id: `${snapshot.warehouseId}-${key}`,
            status: val.status as 'critical' | 'warn',
            title: metricNames[key] || key,
            description: val.status === 'critical'
              ? `${metricNames[key] || key} is critically low at ${(val.score ?? 0).toFixed(1)}. Immediate attention required.`
              : `${metricNames[key] || key} is below target at ${(val.score ?? 0).toFixed(1)}. Monitor closely.`,
            timestamp: snapshot.timestamp ? new Date(snapshot.timestamp) : new Date(),
          })
        }
      })
    }
  })

  return alerts
}

// ═══════════════════════════════════
// Main Dashboard Page
// ═══════════════════════════════════
export default function DashboardPage() {
  const router = useRouter()
  const [metrics, setMetrics] = useState<MetricSnapshot[]>([])
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(true)
  const [selectedNode, setSelectedNode] = useState<any>(null)
  const [user, setUser] = useState<User | null>(null)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [activeView, setActiveView] = useState<ActiveView>('home')
  const [syncing, setSyncing] = useState(false)
  const [downloadingReport, setDownloadingReport] = useState(false)
  const { addNotification } = useNotifications()

  useEffect(() => {
    checkAuthAndRedirect()
    fetchInitialData()
  }, [])

  const checkAuthAndRedirect = async () => {
    try {
      const result = await apiClient.getMe()
      if (result.data?.user) {
        setUser(result.data.user)
      } else {
        router.push('/login')
        return
      }
    } catch (error) {
      console.error('Auth check error:', error)
      router.push('/login')
    }
  }

  const fetchInitialData = async () => {
    try {
      const treeData = await apiClient.getTree()
      if (treeData.data?.snapshots) setMetrics(treeData.data.snapshots)
      if (treeData.data?.warehouses) {
        setWarehouses(treeData.data.warehouses)
        if (treeData.data.warehouses.length > 0)
          setSelectedWarehouse(treeData.data.warehouses[0].id || treeData.data.warehouses[0]._id)
      }
    } catch (error) {
      console.error('Error fetching initial data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleWarehouseChange = async (warehouseId: string) => {
    setSelectedWarehouse(warehouseId)
    try {
      const treeData = await apiClient.getTree(warehouseId)
      if (treeData.data?.snapshots) {
        setMetrics(treeData.data.snapshots)
        addNotification({
          type: 'success', title: 'Warehouse Updated',
          message: `Switched to ${warehouses.find(w => (w.id || w._id) === warehouseId)?.name}`,
          duration: 3000
        })
      }
    } catch (error) {
      console.error('Error fetching warehouse data:', error)
      addNotification({ type: 'error', title: 'Error', message: 'Failed to load warehouse data', duration: 5000 })
    }
  }

  const handleLogout = async () => {
    try {
      await apiClient.logout()
      addNotification({ type: 'info', title: 'Logged Out', message: 'You have been successfully logged out', duration: 3000 })
      setTimeout(() => router.push('/login'), 1000)
    } catch (error) {
      console.error('Logout error:', error)
      addNotification({ type: 'error', title: 'Logout Failed', message: 'An error occurred during logout', duration: 5000 })
    }
  }

  const handleSyncML = async () => {
    if (!selectedWarehouse || syncing) return
    setSyncing(true)
    try {
      const result = await apiClient.syncML(selectedWarehouse)
      if (result.data) {
        addNotification({
          type: 'success', title: 'ML Predictions Synced',
          message: `Dashboard updated with ML-predicted scores (POI: ${result.data.predictions?.poi?.toFixed(1) ?? '?'})`,
          duration: 5000
        })
        const treeData = await apiClient.getTree(selectedWarehouse)
        if (treeData.data?.snapshots) setMetrics(treeData.data.snapshots)
      } else {
        addNotification({ type: 'error', title: 'Sync Failed', message: result.error || 'ML sync failed', duration: 5000 })
      }
    } catch (error) {
      console.error('ML sync error:', error)
      addNotification({ type: 'error', title: 'Sync Error', message: 'Could not connect to ML engine. Is it running?', duration: 5000 })
    } finally {
      setSyncing(false)
    }
  }

  const handleDownloadReport = async () => {
    if (!selectedWarehouse || downloadingReport) return
    setDownloadingReport(true)
    try {
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'
      const response = await fetch(`${API_BASE_URL}/reports/download/${selectedWarehouse}`, { credentials: 'include' })
      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to generate report')
      }
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Nexen_Report_${new Date().toISOString().split('T')[0]}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      addNotification({ type: 'success', title: 'Report Downloaded', message: 'PDF report has been downloaded successfully', duration: 4000 })
    } catch (error: any) {
      console.error('Download report error:', error)
      addNotification({ type: 'error', title: 'Download Failed', message: error.message || 'Failed to download report', duration: 5000 })
    } finally {
      setDownloadingReport(false)
    }
  }

  // ── Compute summary data ──
  const filteredMetrics = metrics.filter(s => s.warehouseId === selectedWarehouse || !selectedWarehouse)
  const rootSnapshot = filteredMetrics[0]
  const rootStatus = rootSnapshot?.rootStatus || 'healthy'
  const rootScore = rootSnapshot?.rootScore ?? 0
  const alerts = generateAlerts(filteredMetrics)
  const criticalCount = alerts.filter(a => a.status === 'critical').length
  const warnCount = alerts.filter(a => a.status === 'warn').length

  const poiData = getMetricFromSnapshots(filteredMetrics, 'poi')
  const otdData = getMetricFromSnapshots(filteredMetrics, 'otd')
  const wptData = getMetricFromSnapshots(filteredMetrics, 'wpt')
  const dfrData = getMetricFromSnapshots(filteredMetrics, 'dfr')

  const metricRowCount = filteredMetrics.reduce((count, snap) => {
    if (snap.metricTree && typeof snap.metricTree === 'object') {
      return count + Object.keys(snap.metricTree).filter(k => {
        const v = (snap.metricTree as Record<string, any>)[k]
        return v && typeof v === 'object' && 'score' in v
      }).length
    }
    return count
  }, 0)

  const viewTitles: Record<ActiveView, { title: string; subtitle: string }> = {
    'home': { title: `Welcome back, ${user?.name?.split(' ')[0] || 'User'}`, subtitle: 'Supply chain performance overview' },
    'metric-tree': { title: 'Metric Tree', subtitle: 'Interactive visualization of your supply chain metrics' },
    'alerts': { title: 'Alerts & Anomalies', subtitle: `${criticalCount} critical, ${warnCount} warnings active` },
    'charts': { title: 'Performance Charts', subtitle: 'Trend analysis across all metrics' },
    'data-table': { title: 'Data Table', subtitle: 'Tabular view of all metric values' },
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: 'var(--bg-primary)' }}>
        <div className="text-center animate-fade-in">
          <div className="w-12 h-12 border-4 rounded-full animate-spin mx-auto mb-4"
            style={{ borderColor: 'rgba(99,102,241,0.2)', borderTopColor: '#6366f1' }} />
          <p className="text-sm gradient-text font-medium">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  const quickStats = [
    { id: 'poi', name: 'POI', ...poiData },
    { id: 'otd', name: 'OTD', ...otdData },
    { id: 'wpt', name: 'WPT', ...wptData },
    { id: 'dfr', name: 'DFR', ...dfrData },
  ]

  const cardIcons = [icons.tree, icons.alert, icons.chart, icons.table]

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        user={user}
        warehouses={warehouses}
        selectedWarehouse={selectedWarehouse}
        onWarehouseChange={handleWarehouseChange}
        onLogout={handleLogout}
        activeView={activeView}
        onNavigate={setActiveView}
      />

      {/* Main Content */}
      <main className={`flex-1 transition-all duration-300 ${sidebarCollapsed ? 'ml-17' : 'ml-65'}`}>

        {/* Top Bar (Glass) */}
        <header className="sticky top-0 z-30 glass-header px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-title" style={{ color: 'var(--text-primary)' }}>
                {viewTitles[activeView].title}
              </h1>
              <p className="text-body" style={{ color: 'var(--text-muted)' }}>{viewTitles[activeView].subtitle}</p>
            </div>
            <div className="flex items-center gap-3">
              {/* Download Report */}
              <button onClick={handleDownloadReport} disabled={downloadingReport || !selectedWarehouse}
                className="btn-glass flex items-center gap-2 text-sm disabled:opacity-40 disabled:cursor-not-allowed">
                {downloadingReport ? (
                  <><div className="w-4 h-4 border-2 border-emerald-300/30 border-t-emerald-400 rounded-full animate-spin" /> Generating...</>
                ) : (
                  <>{icons.download} <span className="hidden sm:inline">Download Report</span></>
                )}
              </button>

              {/* Back Button */}
              {activeView !== 'home' && (
                <button onClick={() => setActiveView('home')}
                  className="btn-glass flex items-center gap-2 text-sm">
                  {icons.back} Back
                </button>
              )}

              {/* Sync ML */}
              <button onClick={handleSyncML} disabled={syncing || !selectedWarehouse}
                className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  background: syncing ? 'rgba(99,102,241,0.1)' : 'var(--accent-gradient)',
                  color: syncing ? '#818cf8' : 'white',
                  boxShadow: syncing ? 'none' : '0 4px 16px -4px rgba(99,102,241,0.4)',
                }}>
                {syncing ? (
                  <><div className="w-4 h-4 border-2 border-indigo-300/30 border-t-indigo-400 rounded-full animate-spin" /> Syncing...</>
                ) : (
                  <>{icons.sync} <span className="hidden sm:inline">Sync ML</span></>
                )}
              </button>

              {/* Status Badge */}
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
                <div className={`status-dot ${rootStatus === 'healthy' ? 'status-healthy' :
                  rootStatus === 'warn' ? 'status-warning' : 'status-critical'}`} />
                <span className="text-caption font-medium hidden sm:inline" style={{ color: 'var(--text-secondary)' }}>
                  {warehouses.find(w => (w.id || w._id) === selectedWarehouse)?.name || 'No Warehouse'}
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="p-8">
          {activeView === 'home' && (
            <div className="space-y-8">
              {/* Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <DashboardCard
                  icon={cardIcons[0]}
                  title="Metric Tree"
                  value={rootScore.toFixed(1)}
                  subtitle="Root POI score across 8 metrics"
                  status={rootStatus}
                  color="indigo"
                  onClick={() => setActiveView('metric-tree')}
                  delay={0}
                />
                <DashboardCard
                  icon={cardIcons[1]}
                  title="Alerts"
                  value={`${criticalCount + warnCount}`}
                  subtitle={`${criticalCount} critical • ${warnCount} warnings`}
                  status={criticalCount > 0 ? 'critical' : warnCount > 0 ? 'warn' : 'healthy'}
                  color="amber"
                  onClick={() => setActiveView('alerts')}
                  delay={100}
                />
                <DashboardCard
                  icon={cardIcons[2]}
                  title="Charts"
                  value="14d"
                  subtitle="Trend analysis for all metrics"
                  color="emerald"
                  onClick={() => setActiveView('charts')}
                  delay={200}
                />
                <DashboardCard
                  icon={cardIcons[3]}
                  title="Data Table"
                  value={`${metricRowCount}`}
                  subtitle="Tabular view of metric values"
                  color="violet"
                  onClick={() => setActiveView('data-table')}
                  delay={300}
                />
              </div>

              {/* Quick Stats Row */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {quickStats.map((stat, i) => (
                  <div key={stat.id} className="glass-card p-4 animate-slide-up" style={{ animationDelay: `${400 + i * 80}ms` }}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-caption font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{stat.name}</span>
                      <div className={`status-dot ${stat.status === 'healthy' ? 'status-healthy' :
                        stat.status === 'warn' ? 'status-warning' : 'status-critical'}`} />
                    </div>
                    <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{stat.score.toFixed(1)}</p>
                    <div className="w-full h-1.5 rounded-full mt-3 overflow-hidden" style={{ background: 'var(--border-subtle)' }}>
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${Math.min(stat.score, 100)}%`,
                          background: stat.score >= 80
                            ? 'linear-gradient(90deg, #10b981, #34d399)'
                            : stat.score >= 60
                              ? 'linear-gradient(90deg, #f59e0b, #fbbf24)'
                              : 'linear-gradient(90deg, #ef4444, #f87171)',
                          animation: 'progressFill 1s ease-out',
                        }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeView === 'metric-tree' && (
            <div className="glass-card p-6 animate-fade-in">
              <MetricTree
                data={metrics}
                onNodeSelect={setSelectedNode}
                selectedWarehouse={selectedWarehouse}
              />
            </div>
          )}

          {activeView === 'alerts' && <AlertsView alerts={alerts} />}
          {activeView === 'charts' && <ChartsView warehouseId={selectedWarehouse} />}
          {activeView === 'data-table' && <DataTableView metrics={filteredMetrics} />}
        </div>
      </main>

      {/* Floating Chatbot Widget */}
      <LogicAssistantWidget />

      <AICopilotSidebar
        isOpen={!!selectedNode}
        onClose={() => setSelectedNode(null)}
        selectedNode={selectedNode}
        warehouseId={selectedWarehouse}
      />
    </div>
  )
}
