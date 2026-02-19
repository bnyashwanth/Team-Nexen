'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import MetricTree from '@/components/MetricTree'
import TrendChart from '@/components/TrendChart'
import AICopilotSidebar from '@/components/AICopilotSidebar'
import { apiClient, type User, type Warehouse, type MetricSnapshot } from '@/lib/api'
import { useNotifications } from '@/components/NotificationSystem'

// ═══════════════════════════════════
// Types
// ═══════════════════════════════════
type ActiveView = 'home' | 'metric-tree' | 'alerts' | 'charts' | 'data-table'

interface Alert {
  id: string
  metric: string
  warehouse: string
  severity: 'critical' | 'warn' | 'healthy'
  score: number
  message: string
  timestamp: string
}

// ═══════════════════════════════════
// Sidebar Component
// ═══════════════════════════════════
function Sidebar({
  collapsed,
  onToggle,
  user,
  warehouses,
  selectedWarehouse,
  onWarehouseChange,
  onLogout,
  activeView,
  onNavigate,
}: {
  collapsed: boolean
  onToggle: () => void
  user: User | null
  warehouses: Warehouse[]
  selectedWarehouse: string
  onWarehouseChange: (id: string) => void
  onLogout: () => void
  activeView: ActiveView
  onNavigate: (view: ActiveView) => void
}) {
  return (
    <aside
      className={`fixed left-0 top-0 h-full z-40 transition-all duration-300 ease-in-out
                ${collapsed ? 'w-[68px]' : 'w-[280px]'}
                bg-white border-r border-slate-200 shadow-sm flex flex-col`}
    >
      {/* Top: Logo + Hamburger */}
      <div className="flex items-center h-16 px-4 border-b border-slate-100">
        <button
          onClick={onToggle}
          className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-600">
            <path d="M3 12h18M3 6h18M3 18h18" />
          </svg>
        </button>
        {!collapsed && (
          <span className="ml-3 text-lg font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            ShopSwift
          </span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3 px-2 space-y-1 overflow-y-auto">
        <NavItem collapsed={collapsed} icon="🏠" label="Dashboard" active={activeView === 'home'} onClick={() => onNavigate('home')} />
        <NavItem collapsed={collapsed} icon="🌳" label="Metric Tree" active={activeView === 'metric-tree'} onClick={() => onNavigate('metric-tree')} />
        <NavItem collapsed={collapsed} icon="🔔" label="Alerts" active={activeView === 'alerts'} onClick={() => onNavigate('alerts')} />
        <NavItem collapsed={collapsed} icon="📊" label="Charts" active={activeView === 'charts'} onClick={() => onNavigate('charts')} />
        <NavItem collapsed={collapsed} icon="📋" label="Data Table" active={activeView === 'data-table'} onClick={() => onNavigate('data-table')} />

        {!collapsed && <div className="h-px bg-slate-100 my-3" />}

        <NavItem collapsed={collapsed} icon="⚙️" label="Admin Portal" active={false} onClick={() => window.location.href = '/admin'} />
      </nav>

      {/* Warehouse Selector */}
      {!collapsed && warehouses.length > 0 && (
        <div className="px-4 py-3 border-t border-slate-100">
          <label className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Warehouse</label>
          <select
            value={selectedWarehouse}
            onChange={(e) => onWarehouseChange(e.target.value)}
            className="mt-1 w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition"
          >
            {warehouses.map((w) => (
              <option key={w.id || w._id} value={w.id || w._id}>
                {w.name} ({w.zone})
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Profile Section */}
      <div className={`border-t border-slate-100 p-3 ${collapsed ? 'flex justify-center' : ''}`}>
        {collapsed ? (
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-sm font-semibold">
            {user?.name?.charAt(0)?.toUpperCase() || 'U'}
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-800 truncate">{user?.name || 'User'}</p>
              <p className="text-xs text-slate-400 truncate">{user?.email}</p>
            </div>
            <button
              onClick={onLogout}
              className="text-slate-400 hover:text-red-500 transition-colors p-1"
              title="Logout"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </aside>
  )
}

function NavItem({ collapsed, icon, label, active, onClick }: {
  collapsed: boolean; icon: string; label: string; active: boolean; onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 rounded-xl transition-all duration-200
                ${collapsed ? 'justify-center px-2 py-3' : 'px-3 py-2.5'}
                ${active
          ? 'bg-indigo-50 text-indigo-700 font-medium shadow-sm'
          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'
        }`}
      title={collapsed ? label : undefined}
    >
      <span className="text-lg flex-shrink-0">{icon}</span>
      {!collapsed && <span className="text-sm">{label}</span>}
    </button>
  )
}

// ═══════════════════════════════════
// Dashboard Cards
// ═══════════════════════════════════
function DashboardCard({ icon, title, value, subtitle, status, color, onClick }: {
  icon: string; title: string; value: string; subtitle: string; status?: string; color: string; onClick: () => void
}) {
  const colorMap: Record<string, { bg: string; border: string; accent: string; iconBg: string }> = {
    indigo: { bg: 'hover:border-indigo-300', border: 'border-slate-200', accent: 'text-indigo-600', iconBg: 'bg-indigo-50 text-indigo-600' },
    emerald: { bg: 'hover:border-emerald-300', border: 'border-slate-200', accent: 'text-emerald-600', iconBg: 'bg-emerald-50 text-emerald-600' },
    amber: { bg: 'hover:border-amber-300', border: 'border-slate-200', accent: 'text-amber-600', iconBg: 'bg-amber-50 text-amber-600' },
    violet: { bg: 'hover:border-violet-300', border: 'border-slate-200', accent: 'text-violet-600', iconBg: 'bg-violet-50 text-violet-600' },
  }
  const c = colorMap[color] || colorMap.indigo

  return (
    <button
      onClick={onClick}
      className={`group relative bg-white rounded-2xl border ${c.border} ${c.bg} p-6 text-left
                transition-all duration-300 hover:shadow-lg hover:-translate-y-1 cursor-pointer w-full`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className={`w-12 h-12 rounded-xl ${c.iconBg} flex items-center justify-center text-2xl
                    transition-transform duration-300 group-hover:scale-110`}>
          {icon}
        </div>
        {status && (
          <span className={`px-2.5 py-1 text-xs font-medium rounded-full
                        ${status === 'healthy' ? 'bg-emerald-50 text-emerald-600' :
              status === 'warn' ? 'bg-amber-50 text-amber-600' :
                'bg-red-50 text-red-600'}`}>
            {status === 'healthy' ? 'Healthy' : status === 'warn' ? 'Warning' : 'Critical'}
          </span>
        )}
      </div>
      <h3 className="text-sm font-medium text-slate-500 mb-1">{title}</h3>
      <p className={`text-3xl font-bold ${c.accent} mb-1`}>{value}</p>
      <p className="text-xs text-slate-400">{subtitle}</p>
      <div className={`absolute bottom-0 left-0 right-0 h-1 rounded-b-2xl bg-gradient-to-r
                ${color === 'indigo' ? 'from-indigo-400 to-indigo-600' :
          color === 'emerald' ? 'from-emerald-400 to-emerald-600' :
            color === 'amber' ? 'from-amber-400 to-amber-600' :
              'from-violet-400 to-violet-600'}
                opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
    </button>
  )
}

// ═══════════════════════════════════
// Alerts View
// ═══════════════════════════════════
function AlertsView({ alerts }: { alerts: Alert[] }) {
  const severityIcon = (s: string) => s === 'critical' ? '🔴' : s === 'warn' ? '🟡' : '🟢'
  const sortedAlerts = [...alerts].sort((a, b) => {
    const order = { critical: 0, warn: 1, healthy: 2 }
    return (order[a.severity] || 2) - (order[b.severity] || 2)
  })

  return (
    <div className="space-y-3">
      {sortedAlerts.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <div className="text-5xl mb-3">✅</div>
          <p className="text-lg font-medium">All systems healthy</p>
          <p className="text-sm">No active alerts at this time</p>
        </div>
      ) : (
        sortedAlerts.map((alert) => (
          <div key={alert.id} className={`bg-white rounded-xl border p-4 flex items-start gap-4 transition-all hover:shadow-md
                        ${alert.severity === 'critical' ? 'border-red-200' : alert.severity === 'warn' ? 'border-amber-200' : 'border-slate-200'}`}>
            <span className="text-xl mt-0.5">{severityIcon(alert.severity)}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-semibold text-slate-800">{alert.metric.toUpperCase()}</span>
                <span className="text-xs text-slate-400">• {alert.warehouse}</span>
              </div>
              <p className="text-sm text-slate-600">{alert.message}</p>
              <div className="flex items-center gap-3 mt-2">
                <span className="text-xs font-mono text-slate-400">Score: {alert.score.toFixed(1)}</span>
                <span className="text-xs text-slate-300">{alert.timestamp}</span>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  )
}

// ═══════════════════════════════════
// Charts View
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
    <div className="space-y-4">
      {/* Metric Selector Chips */}
      <div className="flex flex-wrap gap-2">
        {metrics.map((m) => (
          <button
            key={m}
            onClick={() => setSelectedMetric(m)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200
                            ${selectedMetric === m
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:border-slate-300'
              }`}
          >
            {metricNames[m] || m.toUpperCase()}
          </button>
        ))}
      </div>
      {/* Trend Chart */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <TrendChart metricId={selectedMetric} warehouseId={warehouseId} days={14} />
      </div>
    </div>
  )
}

// ═══════════════════════════════════
// Data Table View
// ═══════════════════════════════════
function DataTableView({ metrics }: { metrics: MetricSnapshot[] }) {
  if (metrics.length === 0) {
    return (
      <div className="text-center py-16 text-slate-400">
        <div className="text-5xl mb-3">📭</div>
        <p className="text-lg font-medium">No data available</p>
        <p className="text-sm">Select a warehouse to view metric data</p>
      </div>
    )
  }

  // Extract flat metric rows from the tree
  const rows: { metric: string; score: number; status: string; warehouse: string; timestamp: string }[] = []
  const metricNames: Record<string, string> = {
    poi: 'Perfect Order Index', otd: 'On-Time Delivery', wpt: 'Warehouse Processing',
    oa: 'Order Accuracy', dfr: 'Damage Free Rate', tt: 'Transit Time',
    pick: 'Picking Time', label: 'Label Generation', pack: 'Packing Speed',
  }

  metrics.forEach((snapshot) => {
    if (snapshot.metricTree && typeof snapshot.metricTree === 'object') {
      Object.entries(snapshot.metricTree).forEach(([key, val]: [string, any]) => {
        if (val && typeof val === 'object' && 'score' in val) {
          rows.push({
            metric: metricNames[key] || key.toUpperCase(),
            score: val.score ?? 0,
            status: val.status || 'healthy',
            warehouse: snapshot.warehouseId,
            timestamp: snapshot.timestamp ? new Date(snapshot.timestamp).toLocaleDateString() : '-',
          })
        }
      })
    }
  })

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left px-4 py-3 font-semibold text-slate-600">Metric</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600">Score</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600">Status</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600">Date</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3 font-medium text-slate-800">{row.metric}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${row.score >= 80 ? 'bg-emerald-500' :
                            row.score >= 60 ? 'bg-amber-500' : 'bg-red-500'
                          }`}
                        style={{ width: `${Math.min(row.score, 100)}%` }}
                      />
                    </div>
                    <span className="text-slate-700 font-mono text-xs">{row.score.toFixed(1)}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full
                                        ${row.status === 'healthy' ? 'bg-emerald-50 text-emerald-600' :
                      row.status === 'warn' ? 'bg-amber-50 text-amber-600' :
                        'bg-red-50 text-red-600'}`}>
                    {row.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-400">{row.timestamp}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length > 0 && (
        <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-400">
          Showing {rows.length} metrics
        </div>
      )}
    </div>
  )
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
      if (treeData.data?.snapshots) {
        setMetrics(treeData.data.snapshots)
      }
      if (treeData.data?.warehouses) {
        setWarehouses(treeData.data.warehouses)
        if (treeData.data.warehouses.length > 0) {
          setSelectedWarehouse(treeData.data.warehouses[0].id || treeData.data.warehouses[0]._id)
        }
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
          type: 'success',
          title: 'Warehouse Updated',
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

  // Compute summary data
  const rootSnapshot = metrics[0]
  const rootStatus = rootSnapshot?.rootStatus || 'healthy'
  const rootScore = rootSnapshot?.rootScore ?? 0
  const alerts = generateAlerts(metrics)
  const criticalCount = alerts.filter(a => a.severity === 'critical').length
  const warnCount = alerts.filter(a => a.severity === 'warn').length

  // View title map
  const viewTitles: Record<ActiveView, { title: string; subtitle: string }> = {
    'home': { title: `Welcome back, ${user?.name?.split(' ')[0] || 'User'}`, subtitle: 'Supply chain performance overview' },
    'metric-tree': { title: 'Metric Tree', subtitle: 'Interactive visualization of your supply chain metrics' },
    'alerts': { title: 'Alerts & Anomalies', subtitle: `${criticalCount} critical, ${warnCount} warnings active` },
    'charts': { title: 'Performance Charts', subtitle: 'Trend analysis across all metrics' },
    'data-table': { title: 'Data Table', subtitle: 'Tabular view of all metric values' },
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-slate-500">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
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
      <main className={`flex-1 transition-all duration-300 ${sidebarCollapsed ? 'ml-[68px]' : 'ml-[280px]'}`}>
        {/* Top Bar */}
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200 px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-slate-800">
                {viewTitles[activeView].title}
              </h1>
              <p className="text-sm text-slate-400">{viewTitles[activeView].subtitle}</p>
            </div>
            <div className="flex items-center gap-3">
              {activeView !== 'home' && (
                <button
                  onClick={() => setActiveView('home')}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
                >
                  ← Back to Dashboard
                </button>
              )}
              <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-200">
                <div className={`w-2 h-2 rounded-full ${rootStatus === 'healthy' ? 'bg-emerald-500' : rootStatus === 'warn' ? 'bg-amber-500' : 'bg-red-500'}`} />
                <span className="text-xs font-medium text-slate-600">
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
                  icon="🌳"
                  title="Metric Tree"
                  value={rootScore.toFixed(1)}
                  subtitle="Root POI score across 8 metrics"
                  status={rootStatus}
                  color="indigo"
                  onClick={() => setActiveView('metric-tree')}
                />
                <DashboardCard
                  icon="🔔"
                  title="Alerts"
                  value={`${criticalCount + warnCount}`}
                  subtitle={`${criticalCount} critical • ${warnCount} warnings`}
                  status={criticalCount > 0 ? 'critical' : warnCount > 0 ? 'warn' : 'healthy'}
                  color="amber"
                  onClick={() => setActiveView('alerts')}
                />
                <DashboardCard
                  icon="📊"
                  title="Charts"
                  value="14d"
                  subtitle="Trend analysis for all metrics"
                  color="emerald"
                  onClick={() => setActiveView('charts')}
                />
                <DashboardCard
                  icon="📋"
                  title="Data Table"
                  value={`${Object.keys(rootSnapshot?.metricTree || {}).length}`}
                  subtitle="Tabular view of metric values"
                  color="violet"
                  onClick={() => setActiveView('data-table')}
                />
              </div>

              {/* Quick Stats Row */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {(['poi', 'otd', 'wpt', 'dfr'] as const).map((metricId) => {
                  const tree = rootSnapshot?.metricTree || {}
                  const val = tree[metricId]
                  const score = val?.score ?? 0
                  const status = val?.status || 'healthy'
                  const names: Record<string, string> = { poi: 'POI', otd: 'OTD', wpt: 'WPT', dfr: 'DFR' }
                  return (
                    <div key={metricId} className="bg-white rounded-xl border border-slate-200 p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-slate-500">{names[metricId]}</span>
                        <div className={`w-2 h-2 rounded-full ${status === 'healthy' ? 'bg-emerald-500' : status === 'warn' ? 'bg-amber-500' : 'bg-red-500'}`} />
                      </div>
                      <p className="text-2xl font-bold text-slate-800">{score.toFixed(1)}</p>
                      <div className="w-full h-1.5 bg-slate-100 rounded-full mt-2 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${score >= 80 ? 'bg-emerald-500' : score >= 60 ? 'bg-amber-500' : 'bg-red-500'}`}
                          style={{ width: `${Math.min(score, 100)}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {activeView === 'metric-tree' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <MetricTree
                data={metrics}
                onNodeSelect={setSelectedNode}
                selectedWarehouse={selectedWarehouse}
              />
            </div>
          )}

          {activeView === 'alerts' && <AlertsView alerts={alerts} />}

          {activeView === 'charts' && <ChartsView warehouseId={selectedWarehouse} />}

          {activeView === 'data-table' && <DataTableView metrics={metrics} />}
        </div>
      </main>

      {/* AI Copilot Sidebar */}
      <AICopilotSidebar
        isOpen={!!selectedNode}
        onClose={() => setSelectedNode(null)}
        selectedNode={selectedNode}
        warehouseId={selectedWarehouse}
      />
    </div>
  )
}

// ═══════════════════════════════════
// Helper: Generate alerts from metric data
// ═══════════════════════════════════
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
            metric: metricNames[key] || key,
            warehouse: snapshot.warehouseId,
            severity: val.status as 'critical' | 'warn',
            score: val.score ?? 0,
            message: val.status === 'critical'
              ? `${metricNames[key] || key} is critically low at ${(val.score ?? 0).toFixed(1)}. Immediate attention required.`
              : `${metricNames[key] || key} is below target at ${(val.score ?? 0).toFixed(1)}. Monitor closely.`,
            timestamp: snapshot.timestamp ? new Date(snapshot.timestamp).toLocaleString() : 'Now',
          })
        }
      })
    }
  })

  return alerts
}
