'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import MetricTree from '@/components/MetricTree'
import { apiClient } from '@/lib/api'

export default function ProductSearchPage() {
    const router = useRouter()
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
            // Manually fetch since we haven't added this to apiClient typed interface yet
            // Using existing auth mechanism via apiClient helper or direct fetch with credentials
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/product/${sku}/tree`, {
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include'
            })

            if (!res.ok) throw new Error('Failed to fetch product data')

            const result = await res.json()
            setData(result)
            setSearchedSku(sku)
        } catch (err) {
            setError('Could not fetch data for this SKU. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="p-8 max-w-7xl mx-auto min-h-screen">
            <div className="mb-8 flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Product Performance</h1>
                    <p className="text-gray-500">Analyze supply chain metrics for individual products (SKUs).</p>
                </div>
                <button onClick={() => router.push('/dashboard')} className="text-sm text-gray-600 hover:text-gray-900">
                    ← Back to Dashboard
                </button>
            </div>

            {/* Search Bar */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-8">
                <form onSubmit={handleSearch} className="flex gap-4">
                    <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Product SKU / ID</label>
                        <input
                            type="text"
                            value={sku}
                            onChange={(e) => setSku(e.target.value)}
                            placeholder="e.g. PROD-1234, SKU-999"
                            className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>
                    <div className="flex items-end">
                        <button
                            type="submit"
                            disabled={loading || !sku.trim()}
                            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 h-[48px]"
                        >
                            {loading ? 'Analyzing...' : 'Analyze SKU'}
                        </button>
                    </div>
                </form>
            </div>

            {/* Results */}
            {error && (
                <div className="p-4 bg-red-50 text-red-700 rounded-lg text-center">
                    {error}
                </div>
            )}

            {data && (
                <div className="space-y-6">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="h-12 w-12 bg-purple-100 rounded-xl flex items-center justify-center text-2xl">
                            📦
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">{data.productName}</h2>
                            <p className="text-sm text-gray-500 font-mono">SKU: {searchedSku.toUpperCase()}</p>
                        </div>
                        <div className="ml-auto">
                            <span className={`px-3 py-1 rounded-full text-sm font-bold ${data.tree.poi.status === 'healthy' ? 'bg-green-100 text-green-700' :
                                data.tree.poi.status === 'warn' ? 'bg-yellow-100 text-yellow-700' :
                                    'bg-red-100 text-red-700'
                                }`}>
                                Overall Score: {data.tree.poi.score}%
                            </span>
                        </div>
                    </div>

                    <div className="bg-white p-1 rounded-xl shadow-sm border border-gray-200 overflow-hidden h-[800px]">
                        <MetricTree
                            data={[{
                                warehouseId: 'PRODUCT_VIEW',
                                timestamp: new Date().toISOString(),
                                rootScore: data.tree.poi.score,
                                rootStatus: data.tree.poi.status,
                                metricTree: data.tree
                            }]}
                            selectedWarehouse="PRODUCT_VIEW"
                            onNodeSelect={(node) => {
                                console.log('Selected node:', node)
                                // Optional: Show a modal or details panel here
                            }}
                        />
                    </div>
                </div>
            )}

            {!data && !loading && !error && (
                <div className="text-center py-20 text-gray-400">
                    <div className="text-6xl mb-4">🔍</div>
                    <p className="text-lg">Enter a Product SKU to visualize its specific Metric Tree.</p>
                </div>
            )}
        </div>
    )
}
