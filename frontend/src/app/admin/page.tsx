'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { apiClient, type User } from '@/lib/api'
import MetricTree from '@/components/MetricTree'


const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'

async function adminFetch(path: string, opts?: RequestInit) {
    const res = await fetch(`${API}/admin${path}`, {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        ...opts
    })
    return res.json()
}

// ═══════════════════════════════════
// Shared UI Components
// ═══════════════════════════════════
function SectionHeader({ title, subtitle }: { title: string; subtitle: string }) {
    return (
        <div className="mb-8">
            <h3 className="text-xl font-bold text-gray-900 tracking-tight">{title}</h3>
            <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
        </div>
    )
}

function StatCard({ label, value, accent = 'indigo' }: { label: string; value: string | number; accent?: string }) {
    const colors: Record<string, string> = {
        indigo: 'from-indigo-500 to-purple-600',
        emerald: 'from-emerald-500 to-teal-600',
        amber: 'from-amber-500 to-orange-600',
        rose: 'from-rose-500 to-pink-600',
    }
    return (
        <div className="relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-6 shadow-sm hover:shadow-md transition-shadow duration-300">
            <div className={`absolute top-0 left-0 h-1 w-full bg-gradient-to-r ${colors[accent] || colors.indigo}`} />
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">{label}</p>
            <p className="text-3xl font-extrabold text-gray-900">{value}</p>
        </div>
    )
}

function EmptyState({ icon, message }: { icon: string; message: string }) {
    return (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <span className="text-5xl mb-4 opacity-60">{icon}</span>
            <p className="text-sm font-medium">{message}</p>
        </div>
    )
}

function LoadingSpinner({ text = 'Loading...' }: { text?: string }) {
    return (
        <div className="flex items-center gap-3 py-8 text-gray-400">
            <div className="h-5 w-5 border-2 border-gray-300 border-t-indigo-500 rounded-full animate-spin" />
            <span className="text-sm">{text}</span>
        </div>
    )
}

// ═══════════════════════════════════
// Anomaly Control Section
// ═══════════════════════════════════
function AnomalyControl() {
    const [alerts, setAlerts] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    const fetchAlerts = async () => {
        setLoading(true)
        const r = await adminFetch('/alerts')
        setAlerts(r.alerts || [])
        setLoading(false)
    }

    useEffect(() => { fetchAlerts() }, [])

    const resolve = async (id: string) => {
        await adminFetch(`/alerts/${id}/resolve`, { method: 'PUT' })
        fetchAlerts()
    }

    const remove = async (id: string) => {
        await adminFetch(`/alerts/${id}`, { method: 'DELETE' })
        fetchAlerts()
    }

    return (
        <div>
            <SectionHeader title="Anomaly & Alert Control" subtitle="Monitor, triage, and resolve active alerts across all warehouses." />

            {loading ? <LoadingSpinner text="Loading alerts..." /> : alerts.length === 0 ? (
                <EmptyState icon="✅" message="All clear — no active alerts" />
            ) : (
                <div className="space-y-4">
                    {alerts.map(a => (
                        <div key={a.id}
                            className={`group rounded-xl border p-5 transition-all duration-200 hover:shadow-md ${a.resolved_at
                                ? 'bg-gray-50/80 border-gray-200'
                                : a.severity === 'critical'
                                    ? 'bg-gradient-to-r from-red-50 to-rose-50 border-red-200 shadow-red-100/50 shadow-sm'
                                    : 'bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-200 shadow-amber-100/50 shadow-sm'
                                }`}
                        >
                            <div className="flex justify-between items-start gap-4">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2.5 mb-2 flex-wrap">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${a.severity === 'critical'
                                            ? 'bg-red-600 text-white'
                                            : 'bg-amber-500 text-white'
                                            }`}>
                                            {a.severity}
                                        </span>
                                        <span className="text-sm font-semibold text-gray-800">
                                            {a.metric_id?.toUpperCase()}
                                        </span>
                                        <span className="text-xs text-gray-400">•</span>
                                        <span className="text-xs text-gray-500 font-mono">{a.warehouse_id}</span>
                                        {a.resolved_at && (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-700">
                                                ✓ Resolved
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-sm text-gray-600 leading-relaxed">{a.ai_summary}</p>
                                    <div className="flex items-center gap-3 mt-2.5">
                                        <span className="text-xs text-gray-400 font-medium">Score: {a.score}%</span>
                                        <span className="text-xs text-gray-300">•</span>
                                        <span className="text-xs text-gray-400">{new Date(a.created_at).toLocaleString()}</span>
                                    </div>
                                </div>
                                <div className="flex gap-2 shrink-0">
                                    {!a.resolved_at && (
                                        <button onClick={() => resolve(a.id)}
                                            className="text-xs px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 active:scale-95 transition-all font-medium shadow-sm">
                                            Resolve
                                        </button>
                                    )}
                                    <button onClick={() => remove(a.id)}
                                        className="text-xs px-4 py-2 text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-100 hover:text-gray-700 active:scale-95 transition-all font-medium">
                                        Delete
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

// ═══════════════════════════════════
// User Management Section
// ═══════════════════════════════════
function UserManagement() {
    const [users, setUsers] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    const fetchUsers = async () => {
        setLoading(true)
        const r = await adminFetch('/users')
        setUsers(r.users || [])
        setLoading(false)
    }

    useEffect(() => { fetchUsers() }, [])

    const toggleRole = async (id: string, current: string) => {
        const newRole = current === 'manager' ? 'analyst' : 'manager'
        await adminFetch(`/users/${id}/role`, { method: 'PUT', body: JSON.stringify({ role: newRole }) })
        fetchUsers()
    }

    const deleteUser = async (id: string) => {
        if (!confirm('Are you sure you want to delete this user?')) return
        await adminFetch(`/users/${id}`, { method: 'DELETE' })
        fetchUsers()
    }

    return (
        <div>
            <SectionHeader title="User Management" subtitle="Manage user accounts and role assignments." />

            {loading ? <LoadingSpinner text="Loading users..." /> : (
                <div className="overflow-hidden rounded-xl border border-gray-200 shadow-sm">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-gray-50/80">
                                <th className="text-left py-3.5 px-5 font-semibold text-gray-500 text-xs uppercase tracking-wider">Name</th>
                                <th className="text-left py-3.5 px-5 font-semibold text-gray-500 text-xs uppercase tracking-wider">Email</th>
                                <th className="text-left py-3.5 px-5 font-semibold text-gray-500 text-xs uppercase tracking-wider">Role</th>
                                <th className="text-left py-3.5 px-5 font-semibold text-gray-500 text-xs uppercase tracking-wider">Last Login</th>
                                <th className="text-right py-3.5 px-5 font-semibold text-gray-500 text-xs uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {users.map(u => (
                                <tr key={u.id} className="hover:bg-indigo-50/30 transition-colors">
                                    <td className="py-4 px-5">
                                        <div className="flex items-center gap-3">
                                            <div className="h-8 w-8 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0">
                                                {u.name?.[0]?.toUpperCase() || '?'}
                                            </div>
                                            <span className="font-semibold text-gray-900">{u.name}</span>
                                        </div>
                                    </td>
                                    <td className="py-4 px-5 text-gray-500 font-mono text-xs">{u.email}</td>
                                    <td className="py-4 px-5">
                                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${u.role === 'manager'
                                            ? 'bg-purple-100 text-purple-700 ring-1 ring-purple-200'
                                            : 'bg-sky-100 text-sky-700 ring-1 ring-sky-200'
                                            }`}>
                                            {u.role}
                                        </span>
                                    </td>
                                    <td className="py-4 px-5 text-gray-400 text-xs">
                                        {u.last_login ? new Date(u.last_login).toLocaleString() : '—'}
                                    </td>
                                    <td className="py-4 px-5">
                                        <div className="flex gap-2 justify-end">
                                            <button onClick={() => toggleRole(u.id, u.role)}
                                                className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600 font-medium transition-all active:scale-95">
                                                {u.role === 'manager' ? '↓ Demote' : '↑ Promote'}
                                            </button>
                                            <button onClick={() => deleteUser(u.id)}
                                                className="text-xs px-3 py-1.5 text-red-500 border border-red-200 rounded-lg hover:bg-red-50 font-medium transition-all active:scale-95">
                                                Delete
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )
}

// ═══════════════════════════════════
// System Logs Section
// ═══════════════════════════════════
function SystemLogs() {
    const [logs, setLogs] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        adminFetch('/logs').then(r => {
            setLogs(r.logs || [])
            setLoading(false)
        })
    }, [])

    return (
        <div>
            <SectionHeader title="System Logs" subtitle="AI Agent interaction logs and system activity." />

            {loading ? <LoadingSpinner text="Loading logs..." /> : logs.length === 0 ? (
                <EmptyState icon="📋" message="No agent interactions logged yet" />
            ) : (
                <div className="space-y-4 max-h-[650px] overflow-y-auto pr-2 scrollbar-thin">
                    {logs.map((log, i) => (
                        <div key={log.id || i} className="rounded-xl border border-gray-200 bg-white overflow-hidden hover:shadow-md transition-shadow duration-200">
                            <div className="flex items-center justify-between px-5 py-3 bg-gray-50/60 border-b border-gray-100">
                                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-700">
                                    {log.context_node || 'general'}
                                </span>
                                <span className="text-[11px] text-gray-400 font-mono">
                                    {new Date(log.created_at).toLocaleString()}
                                </span>
                            </div>
                            <div className="p-5 space-y-3">
                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">User</p>
                                    <p className="text-sm text-gray-800 leading-relaxed">{log.user_message}</p>
                                </div>
                                <div className="border-t border-dashed border-gray-150 pt-3">
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Agent</p>
                                    <p className="text-sm text-gray-600 leading-relaxed">{log.agent_response?.substring(0, 250)}...</p>
                                </div>
                            </div>
                            <div className="px-5 py-2.5 bg-gray-50/40 border-t border-gray-100">
                                <span className="text-[10px] text-gray-400 font-medium">~{log.tokens_used} tokens</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

// ═══════════════════════════════════
// Profile Maintenance Section
// ═══════════════════════════════════
function ProfileMaintenance({ user }: { user: User }) {
    const [name, setName] = useState(user.name || '')
    const [currentPw, setCurrentPw] = useState('')
    const [newPw, setNewPw] = useState('')
    const [saving, setSaving] = useState(false)
    const [msg, setMsg] = useState('')

    const handleSave = async () => {
        setSaving(true)
        setMsg('')
        const body: any = {}
        if (name !== user.name) body.name = name
        if (newPw) { body.currentPassword = currentPw; body.newPassword = newPw }

        if (Object.keys(body).length === 0) { setMsg('No changes to save'); setSaving(false); return }

        const res = await adminFetch('/profile', { method: 'PUT', body: JSON.stringify(body) })
        setMsg(res.message || res.error)
        setSaving(false)
        setCurrentPw('')
        setNewPw('')
    }

    const inputClass = "w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-900 bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none"
    const disabledInputClass = "w-full px-4 py-2.5 border border-gray-100 rounded-xl bg-gray-50 text-gray-400 text-sm cursor-not-allowed"

    return (
        <div>
            <SectionHeader title="Profile Settings" subtitle="Update your admin account details." />

            <div className="max-w-lg space-y-6">
                <div className="flex items-center gap-5 p-5 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl border border-indigo-100">
                    <div className="h-14 w-14 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center text-white text-xl font-bold shadow-lg shadow-indigo-200">
                        {user.name?.[0]?.toUpperCase() || 'A'}
                    </div>
                    <div>
                        <p className="font-bold text-gray-900">{user.name}</p>
                        <p className="text-sm text-gray-500">{user.email}</p>
                        <span className="inline-flex items-center mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-purple-100 text-purple-700 tracking-wider">
                            {user.role}
                        </span>
                    </div>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Email</label>
                        <input value={user.email} disabled className={disabledInputClass} />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Display Name</label>
                        <input value={name} onChange={e => setName(e.target.value)} className={inputClass} />
                    </div>
                </div>

                <div className="border-t border-gray-100 pt-6">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Change Password</p>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Current Password</label>
                            <input type="password" value={currentPw} onChange={e => setCurrentPw(e.target.value)}
                                className={inputClass} placeholder="Enter current password" />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">New Password</label>
                            <input type="password" value={newPw} onChange={e => setNewPw(e.target.value)}
                                className={inputClass} placeholder="Enter new password" />
                        </div>
                    </div>
                </div>

                <button onClick={handleSave} disabled={saving}
                    className="w-full py-3 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold rounded-xl transition-all disabled:opacity-50 shadow-lg shadow-indigo-200 active:scale-[0.98]">
                    {saving ? 'Saving...' : 'Save Changes'}
                </button>
                {msg && <p className={`text-sm text-center font-medium ${msg.includes('updated') ? 'text-emerald-600' : 'text-red-500'}`}>{msg}</p>}
            </div>
        </div>
    )
}

// ═══════════════════════════════════
// Unified Warehouse & Metrics Section
// ═══════════════════════════════════
function UnifiedWarehouseMetrics() {
    const [warehouses, setWarehouses] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [msg, setMsg] = useState('')
    const [result, setResult] = useState<any>(null)

    const [whForm, setWhForm] = useState({ id: '', name: '', zone: '', city: '', is_active: true })
    const [metricForm, setMetricForm] = useState({ metric_id: 'pick', staff_count: '', hours_of_day: '', day_of_week: '1', order_volume: '' })
    const [isNew, setIsNew] = useState(true)

    const METRICS = [
        { id: 'pick', label: 'Picking Time' },
        { id: 'pack', label: 'Packing Speed' },
        { id: 'tt', label: 'Transit Time' },
        { id: 'label', label: 'Label Generation' },
    ]

    const fetchWarehouses = async () => {
        setLoading(true)
        const r = await adminFetch('/warehouses')
        setWarehouses(r.warehouses || [])
        setLoading(false)
    }

    useEffect(() => { fetchWarehouses() }, [])

    const handleSelectWarehouse = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const wid = e.target.value
        if (wid === 'NEW') {
            setIsNew(true)
            setWhForm({ id: '', name: '', zone: '', city: '', is_active: true })
        } else {
            setIsNew(false)
            const w = warehouses.find(w => w.id === wid)
            if (w) setWhForm({ id: w.id, name: w.name, zone: w.zone, city: w.city, is_active: w.is_active })
        }
        setMsg('')
        setResult(null)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)
        setMsg('')
        setResult(null)

        const payload = {
            warehouse: whForm,
            metrics: {
                metric_id: metricForm.metric_id,
                staff_count: parseInt(metricForm.staff_count),
                hours_of_day: parseInt(metricForm.hours_of_day),
                day_of_week: parseInt(metricForm.day_of_week),
                order_volume: parseInt(metricForm.order_volume)
            }
        }

        const res = await adminFetch('/warehouse-setup', {
            method: 'POST',
            body: JSON.stringify(payload)
        })

        if (res.error) {
            setMsg(res.error)
        } else {
            setMsg('Saved successfully!')
            setResult(res.result)
            fetchWarehouses()
        }
        setSaving(false)
    }

    const inputClass = "w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-900 bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none"
    const labelClass = "block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5"

    return (
        <div>
            <SectionHeader title="Warehouse & Metrics Management" subtitle="Manage warehouse details and configure operational metrics in one step." />

            <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column: Warehouse Details */}
                <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow duration-300">
                    <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
                        <div className="h-10 w-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-white text-lg shadow-md shadow-indigo-200">
                            🏭
                        </div>
                        <h4 className="text-base font-bold text-gray-900">Warehouse Details</h4>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className={labelClass}>Select Warehouse</label>
                            <select onChange={handleSelectWarehouse} value={isNew ? 'NEW' : whForm.id}
                                className={inputClass}>
                                <option value="NEW">+ Add New Warehouse</option>
                                {warehouses.map(w => <option key={w.id} value={w.id}>{w.name} ({w.id})</option>)}
                            </select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className={labelClass}>ID</label>
                                <input type="text" required value={whForm.id} disabled={!isNew}
                                    onChange={e => setWhForm(p => ({ ...p, id: e.target.value }))}
                                    className={`${inputClass} ${!isNew ? '!bg-gray-50 !text-gray-400 !cursor-not-allowed' : ''}`}
                                    placeholder="wh_001" />
                            </div>
                            <div>
                                <label className={labelClass}>Name</label>
                                <input type="text" required value={whForm.name}
                                    onChange={e => setWhForm(p => ({ ...p, name: e.target.value }))}
                                    className={inputClass} placeholder="Central Hub" />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className={labelClass}>Zone</label>
                                <input type="text" required value={whForm.zone}
                                    onChange={e => setWhForm(p => ({ ...p, zone: e.target.value }))}
                                    className={inputClass} placeholder="North" />
                            </div>
                            <div>
                                <label className={labelClass}>City</label>
                                <input type="text" required value={whForm.city}
                                    onChange={e => setWhForm(p => ({ ...p, city: e.target.value }))}
                                    className={inputClass} placeholder="New Delhi" />
                            </div>
                        </div>

                        <div className="flex items-center gap-3 pt-2">
                            <div className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" id="is_active" checked={whForm.is_active}
                                    onChange={e => setWhForm(p => ({ ...p, is_active: e.target.checked }))}
                                    className="sr-only peer" />
                                <div className="w-9 h-5 bg-gray-200 peer-focus:ring-2 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-indigo-600 after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all" />
                            </div>
                            <label htmlFor="is_active" className="text-sm text-gray-600 font-medium cursor-pointer">Active</label>
                        </div>
                    </div>
                </div>

                {/* Right Column: Metrics Config */}
                <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow duration-300">
                    <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
                        <div className="h-10 w-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center text-white text-lg shadow-md shadow-emerald-200">
                            📊
                        </div>
                        <h4 className="text-base font-bold text-gray-900">Operational Metrics</h4>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className={labelClass}>Target Metric</label>
                            <select value={metricForm.metric_id} onChange={e => setMetricForm(p => ({ ...p, metric_id: e.target.value }))}
                                className={inputClass}>
                                {METRICS.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
                            </select>
                        </div>

                        <div>
                            <label className={labelClass}>Order Volume</label>
                            <input type="number" required min="0" value={metricForm.order_volume}
                                onChange={e => setMetricForm(p => ({ ...p, order_volume: e.target.value }))}
                                className={inputClass} placeholder="1200" />
                        </div>

                        <div>
                            <label className={labelClass}>Staff Count</label>
                            <input type="number" required min="1" value={metricForm.staff_count}
                                onChange={e => setMetricForm(p => ({ ...p, staff_count: e.target.value }))}
                                className={inputClass} placeholder="45" />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className={labelClass}>Hour (0-23)</label>
                                <input type="number" required min="0" max="23" value={metricForm.hours_of_day}
                                    onChange={e => setMetricForm(p => ({ ...p, hours_of_day: e.target.value }))}
                                    className={inputClass} placeholder="14" />
                            </div>
                            <div>
                                <label className={labelClass}>Day (0-6)</label>
                                <input type="number" required min="0" max="6" value={metricForm.day_of_week}
                                    onChange={e => setMetricForm(p => ({ ...p, day_of_week: e.target.value }))}
                                    className={inputClass} placeholder="1" />
                            </div>
                        </div>

                        <div className="pt-3">
                            <button type="submit" disabled={saving}
                                className="w-full py-3 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold rounded-xl transition-all disabled:opacity-50 shadow-lg shadow-indigo-200 active:scale-[0.98]">
                                {saving ? 'Processing...' : 'Save & Calculate Metrics'}
                            </button>
                        </div>
                    </div>
                </div>
            </form>

            {/* Results Display */}
            {msg && (
                <div className={`mt-6 p-4 rounded-xl text-center text-sm font-semibold ${msg.includes('success') ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                    {msg}
                </div>
            )}

            {result && (
                <div className="mt-6 grid grid-cols-2 gap-6">
                    <StatCard label="Rolling 7-Day Avg" value={`${result.rolling_7d_avg}%`} accent="indigo" />
                    <StatCard label="Predicted Score" value={`${result.predicted_score}%`} accent="emerald" />
                </div>
            )}
        </div>
    )
}

// ═══════════════════════════════════
// Product Analysis Section
// ═══════════════════════════════════
function ProductAnalysis() {
    const [sku, setSku] = useState('')
    const [loading, setLoading] = useState(false)
    const [data, setData] = useState<any>(null)
    const [error, setError] = useState('')
    const [searchedSku, setSearchedSku] = useState('')

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!sku.trim()) return

        setLoading(true)
        setError('')
        setData(null)

        try {
            const res = await adminFetch(`/product/${sku}/tree`)
            if (res.error) throw new Error(res.error)
            setData(res)
            setSearchedSku(sku)
        } catch (err: any) {
            setError(err.message || 'Could not fetch data for this SKU.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div>
            <SectionHeader title="Product Analysis" subtitle="Analyze supply chain metrics for individual products (SKUs)." />

            {/* Search Bar */}
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm mb-8">
                <form onSubmit={handleSearch} className="flex gap-4">
                    <div className="flex-1">
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Product SKU</label>
                        <input
                            type="text"
                            value={sku}
                            onChange={(e) => setSku(e.target.value)}
                            placeholder="e.g. PROD-1234, SKU-999"
                            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-900 bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none"
                        />
                    </div>
                    <div className="flex items-end">
                        <button
                            type="submit"
                            disabled={loading || !sku.trim()}
                            className="px-8 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold rounded-xl transition-all disabled:opacity-50 shadow-lg shadow-indigo-200 active:scale-[0.98]"
                        >
                            {loading ? 'Analyzing...' : 'Analyze'}
                        </button>
                    </div>
                </form>
            </div>

            {error && (
                <div className="p-4 bg-red-50 text-red-700 rounded-xl text-center mb-6 border border-red-200 text-sm font-medium">
                    {error}
                </div>
            )}

            {data && (
                <div className="space-y-6">
                    <div className="flex items-center gap-4 p-5 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-2xl border border-purple-100">
                        <div className="h-12 w-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl flex items-center justify-center text-white text-2xl shadow-lg shadow-purple-200">
                            📦
                        </div>
                        <div className="flex-1">
                            <h4 className="text-lg font-bold text-gray-900">{data.productName}</h4>
                            <p className="text-xs text-gray-500 font-mono">SKU: {searchedSku.toUpperCase()}</p>
                        </div>
                        <div>
                            <span className={`px-4 py-1.5 rounded-full text-xs font-bold shadow-sm ${data.tree.poi.status === 'healthy'
                                ? 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200'
                                : data.tree.poi.status === 'warn'
                                    ? 'bg-amber-100 text-amber-700 ring-1 ring-amber-200'
                                    : 'bg-red-100 text-red-700 ring-1 ring-red-200'
                                }`}>
                                POI Score: {data.tree.poi.score}%
                            </span>
                        </div>
                    </div>

                    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden h-[600px]">
                        <MetricTree
                            data={[{
                                warehouseId: 'PRODUCT_VIEW',
                                timestamp: new Date().toISOString(),
                                rootScore: data.tree.poi.score,
                                rootStatus: data.tree.poi.status,
                                metricTree: data.tree
                            }]}
                            selectedWarehouse="PRODUCT_VIEW"
                            onNodeSelect={(node) => console.log(node)}
                        />
                    </div>
                </div>
            )}

            {!data && !loading && !error && (
                <EmptyState icon="🔍" message="Enter a Product SKU to visualize its specific Metric Tree." />
            )}
        </div>
    )
}
// ═══════════════════════════════════
// ML Engine Diagnostics
// ═══════════════════════════════════
function MLDiagnostics() {
    const [health, setHealth] = useState<any>(null)
    const [healthLoading, setHealthLoading] = useState(true)
    const [healthError, setHealthError] = useState('')
    const [predictionModel, setPredictionModel] = useState('analyze')
    const [predictionInput, setPredictionInput] = useState('')
    const [predictionResult, setPredictionResult] = useState<any>(null)
    const [predicting, setPredicting] = useState(false)

    useEffect(() => { fetchHealth() }, [])

    const fetchHealth = async () => {
        setHealthLoading(true)
        setHealthError('')
        try {
            const res = await fetch(`${API}/ml/health`, { credentials: 'include' })
            const data = await res.json()
            setHealth(data)
        } catch (err: any) {
            setHealthError(err.message || 'Failed to connect to ML Engine')
        } finally {
            setHealthLoading(false)
        }
    }

    const runPrediction = async () => {
        setPredicting(true)
        setPredictionResult(null)
        try {
            const body = predictionInput ? JSON.parse(predictionInput) : {}
            const endpoint = predictionModel.startsWith('predict/')
                ? `/ml/${predictionModel}`
                : `/ml/${predictionModel}`
            const res = await fetch(`${API}${endpoint}`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            })
            const data = await res.json()
            setPredictionResult(data)
        } catch (err: any) {
            setPredictionResult({ error: err.message || 'Prediction failed' })
        } finally {
            setPredicting(false)
        }
    }

    const sampleInputs: Record<string, string> = {
        'analyze': JSON.stringify({ score: 45, rolling_avg_7d: 78, hour_of_day: 14, day_of_week: 3, orders_volume: 1200, staff_count: 45, warehouse_id: 'WH-001', metric_id: 'poi' }, null, 2),
        'root-cause': JSON.stringify({ poi_score: 45, label_score: 25, pick_score: 70, pack_score: 80, tt_score: 60, oa_score: 65, orders_volume: 1200, warehouse_id: 'WH-001', zone: 'North' }, null, 2),
        'predict/poi': JSON.stringify({ day_of_week: 3, is_flash_sale_day: 0, orders_volume: 1000, poi_score_t_minus_1: 72, poi_score_t_minus_2: 75, poi_score_t_minus_3: 70, warehouse_id: 'WH-001' }, null, 2),
        'predict/wpt': JSON.stringify({ label_score: 80, pick_score: 85, pack_score: 90 }, null, 2),
        'predict/otd': JSON.stringify({ label_score: 80, pick_score: 85, pack_score: 90, wpt_score_actual: 84, tt_score: 78 }, null, 2),
        'predict/poi-actual': JSON.stringify({ label_score: 80, pick_score: 85, pack_score: 90, wpt_score_actual: 84, tt_score: 78 }, null, 2),
    }

    return (
        <div className="space-y-8">
            <SectionHeader title="ML Engine Diagnostics" subtitle="Monitor model status and test predictions live" />

            {/* Health Status */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Model Status</h4>
                    <button onClick={fetchHealth} className="text-xs font-medium text-indigo-600 hover:text-indigo-700 transition-colors">
                        Refresh
                    </button>
                </div>
                <div className="p-6">
                    {healthLoading ? (
                        <LoadingSpinner />
                    ) : healthError ? (
                        <div className="bg-red-50 text-red-700 px-4 py-3 rounded-xl text-sm border border-red-100">
                            <span className="font-medium">ML Engine Unreachable:</span> {healthError}
                            <p className="mt-1 text-xs text-red-500">Make sure the Flask API is running on port 5001</p>
                        </div>
                    ) : health ? (
                        <div>
                            <div className="flex items-center gap-2 mb-5">
                                <div className={`h-3 w-3 rounded-full ${health.status === 'connected' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                                <span className={`text-sm font-semibold ${health.status === 'connected' ? 'text-emerald-700' : 'text-red-700'}`}>
                                    {health.status === 'connected' ? 'Connected' : 'Disconnected'}
                                </span>
                                <span className="text-xs text-gray-400">({health.ml_engine_url})</span>
                            </div>
                            {health.models && (
                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                                    {Object.entries(health.models).map(([name, loaded]) => (
                                        <div key={name} className={`flex items-center gap-2 px-4 py-3 rounded-xl border ${loaded ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'
                                            }`}>
                                            <div className={`h-2 w-2 rounded-full ${loaded ? 'bg-emerald-500' : 'bg-red-400'}`} />
                                            <span className={`text-xs font-medium ${loaded ? 'text-emerald-800' : 'text-red-700'}`}>
                                                {name.replace(/_/g, ' ')}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : null}
                </div>
            </div>

            {/* Prediction Tester */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100">
                    <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Live Prediction Tester</h4>
                </div>
                <div className="p-6 space-y-4">
                    <div className="flex flex-wrap gap-2">
                        {Object.keys(sampleInputs).map(endpoint => (
                            <button
                                key={endpoint}
                                onClick={() => { setPredictionModel(endpoint); setPredictionInput(sampleInputs[endpoint]); setPredictionResult(null) }}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${predictionModel === endpoint
                                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-sm'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                            >
                                {endpoint}
                            </button>
                        ))}
                    </div>

                    <textarea
                        value={predictionInput}
                        onChange={e => setPredictionInput(e.target.value)}
                        placeholder='{ "score": 75, ... }'
                        rows={8}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-mono text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all resize-none"
                    />

                    <button
                        onClick={runPrediction}
                        disabled={predicting}
                        className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm font-semibold rounded-xl hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 transition-all shadow-sm"
                    >
                        {predicting ? 'Running...' : 'Run Prediction'}
                    </button>

                    {predictionResult && (
                        <div className="bg-gray-900 rounded-xl p-5 overflow-auto">
                            <p className="text-xs text-gray-400 mb-2 font-medium uppercase tracking-wider">Response</p>
                            <pre className="text-sm text-emerald-400 font-mono whitespace-pre-wrap">
                                {JSON.stringify(predictionResult, null, 2)}
                            </pre>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

// ═══════════════════════════════════
// Sidebar Navigation Items
// ═══════════════════════════════════
const NAV_ITEMS = [
    { id: 'warehouse-metrics', label: 'Warehouse & Metrics', icon: '🏭' },
    { id: 'product-analysis', label: 'Product Analysis', icon: '📦' },
    { id: 'anomalies', label: 'Anomaly Control', icon: '🚨' },
    { id: 'users', label: 'User Management', icon: '👥' },
    { id: 'logs', label: 'System Logs', icon: '📋' },
    { id: 'ml-engine', label: 'ML Diagnostics', icon: '⚙️' },
    { id: 'profile', label: 'Profile Maintenance', icon: '👤' },
]


// ... rest of the code remains the same ...
export default function AdminPage() {
    const router = useRouter()
    const [user, setUser] = useState<User | null>(null)
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState('warehouse-metrics')

    useEffect(() => {
        checkAdminAuth()
    }, [])

    const checkAdminAuth = async () => {
        try {
            const result = await apiClient.getMe()
            if (result.data?.user) {
                if (result.data.user.role !== 'manager') {
                    router.push('/admin/login')
                    return
                }
                setUser(result.data.user)
            } else {
                router.push('/admin/login')
            }
        } catch {
            router.push('/admin/login')
        } finally {
            setLoading(false)
        }
    }

    const handleLogout = async () => {
        await apiClient.logout()
        router.push('/admin/login')
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900">
                <div className="text-center">
                    <div className="h-12 w-12 border-[3px] border-indigo-400/30 border-t-indigo-400 rounded-full animate-spin mx-auto" />
                    <p className="mt-4 text-sm text-slate-400 font-medium">Verifying admin access...</p>
                </div>
            </div>
        )
    }

    if (!user) return null

    const renderContent = () => {
        switch (activeTab) {
            case 'warehouse-metrics': return <UnifiedWarehouseMetrics />
            case 'product-analysis': return <ProductAnalysis />
            case 'anomalies': return <AnomalyControl />
            case 'users': return <UserManagement />
            case 'logs': return <SystemLogs />
            case 'ml-engine': return <MLDiagnostics />
            case 'profile': return <ProfileMaintenance user={user} />
            default: return <UnifiedWarehouseMetrics />
        }
    }

    return (
        <div className="min-h-screen bg-white flex">
            {/* Sidebar */}
            <aside className="w-[280px] bg-white border-r border-gray-200 text-gray-900 flex flex-col min-h-screen shrink-0 shadow-sm">
                {/* Logo */}
                <div className="px-6 py-6 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
                            <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                            </svg>
                        </div>
                        <div>
                            <div className="font-bold text-sm tracking-tight text-gray-900">ShopSwift Admin</div>
                            <div className="text-[11px] text-gray-500 font-medium">Supply Chain Portal</div>
                        </div>
                    </div>
                </div>

                {/* Nav Items */}
                <nav className="flex-1 px-4 py-5 space-y-1">
                    {NAV_ITEMS.map(item => (
                        <button
                            key={item.id}
                            onClick={() => setActiveTab(item.id)}
                            className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-[13px] font-semibold transition-all duration-200 ${activeTab === item.id
                                ? 'bg-indigo-50 text-indigo-700 shadow-sm'
                                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                }`}
                        >
                            <span className="text-base shrink-0">{item.icon}</span>
                            <span>{item.label}</span>
                            {activeTab === item.id && (
                                <span className="ml-auto h-1.5 w-1.5 rounded-full bg-indigo-600 animate-pulse" />
                            )}
                        </button>
                    ))}
                </nav>

                {/* Bottom: Quick Link */}
                <div className="px-4 pb-2">
                    <a href="/dashboard"
                        className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-[12px] text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 transition-all font-medium">
                        <span>←</span>
                        <span>Back to Dashboard</span>
                    </a>
                </div>

                {/* User + Logout */}
                <div className="px-4 py-5 border-t border-gray-100">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="h-9 w-9 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-xl flex items-center justify-center text-white text-xs font-bold shadow-md">
                            {user.name?.[0]?.toUpperCase() || 'A'}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold truncate text-gray-900">{user.name}</div>
                            <div className="text-[11px] text-gray-500 truncate">{user.email}</div>
                        </div>
                    </div>
                    <button onClick={handleLogout}
                        className="w-full text-[12px] py-2.5 px-3 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 hover:text-gray-900 hover:border-gray-300 transition-all font-medium">
                        Sign Out
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-auto">
                {/* Top Bar */}
                <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-lg border-b border-gray-200/60 px-8 py-4">
                    <div className="flex items-center justify-between max-w-6xl">
                        <div>
                            <h2 className="text-xl font-bold text-gray-900 tracking-tight flex items-center gap-2.5">
                                <span>{NAV_ITEMS.find(n => n.id === activeTab)?.icon}</span>
                                {NAV_ITEMS.find(n => n.id === activeTab)?.label}
                            </h2>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="text-xs text-gray-400 font-mono">
                                {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                            </span>
                            <div className="h-4 w-px bg-gray-200" />
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200">
                                ● Online
                            </span>
                        </div>
                    </div>
                </div>

                {/* Content Area */}
                <div className="p-8 max-w-6xl">
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200/60 p-8">
                        {renderContent()}
                    </div>
                </div>
            </main>
        </div>
    )
}
