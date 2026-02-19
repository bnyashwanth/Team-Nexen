'use client'

import { useState } from 'react'
import { useNotifications } from '@/components/NotificationSystem'
import { apiClient } from '@/lib/api'

export default function AdminForm() {
    const [formData, setFormData] = useState({
        warehouse_id: '',
        metric_id: '',
        score: '',
        orders_volume: '',
        staff_count: ''
    })
    const [loading, setLoading] = useState(false)
    const { addNotification } = useNotifications()

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target
        setFormData(prev => ({
            ...prev,
            [name]: value
        }))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            const response = await fetch('/api/ingest', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    ...formData,
                    score: parseFloat(formData.score),
                    orders_volume: parseInt(formData.orders_volume),
                    staff_count: parseInt(formData.staff_count)
                })
            })

            const result = await response.json()

            if (response.ok) {
                addNotification({
                    type: 'success',
                    title: 'Data Submitted Successfully',
                    message: 'Warehouse metrics have been analyzed and stored.',
                    duration: 5000
                })
                setFormData({
                    warehouse_id: '',
                    metric_id: '',
                    score: '',
                    orders_volume: '',
                    staff_count: ''
                })
            } else {
                addNotification({
                    type: 'error',
                    title: 'Submission Failed',
                    message: result.error || 'An error occurred while submitting data',
                    duration: 5000
                })
            }
        } catch (error) {
            addNotification({
                type: 'error',
                title: 'Network Error',
                message: 'Unable to connect to the server. Please try again.',
                duration: 5000
            })
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="max-w-md mx-auto">
            <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                    <label htmlFor="warehouse_id" className="block text-sm font-medium text-gray-700">
                        Warehouse ID
                    </label>
                    <input
                        type="text"
                        id="warehouse_id"
                        name="warehouse_id"
                        value={formData.warehouse_id}
                        onChange={handleChange}
                        required
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        placeholder="e.g., WH-001"
                    />
                </div>

                <div>
                    <label htmlFor="metric_id" className="block text-sm font-medium text-gray-700">
                        Metric ID
                    </label>
                    <input
                        type="text"
                        id="metric_id"
                        name="metric_id"
                        value={formData.metric_id}
                        onChange={handleChange}
                        required
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        placeholder="e.g., efficiency-score"
                    />
                </div>

                <div>
                    <label htmlFor="score" className="block text-sm font-medium text-gray-700">
                        Performance Score
                    </label>
                    <input
                        type="number"
                        id="score"
                        name="score"
                        value={formData.score}
                        onChange={handleChange}
                        required
                        step="0.01"
                        min="0"
                        max="100"
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        placeholder="0-100"
                    />
                </div>

                <div>
                    <label htmlFor="orders_volume" className="block text-sm font-medium text-gray-700">
                        Orders Volume
                    </label>
                    <input
                        type="number"
                        id="orders_volume"
                        name="orders_volume"
                        value={formData.orders_volume}
                        onChange={handleChange}
                        required
                        min="0"
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Number of orders"
                    />
                </div>

                <div>
                    <label htmlFor="staff_count" className="block text-sm font-medium text-gray-700">
                        Staff Count
                    </label>
                    <input
                        type="number"
                        id="staff_count"
                        name="staff_count"
                        value={formData.staff_count}
                        onChange={handleChange}
                        required
                        min="0"
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Number of staff members"
                    />
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? 'Processing...' : 'Submit Data'}
                </button>

                <div className="relative flex py-2 items-center">
                    <div className="flex-grow border-t border-gray-300"></div>
                    <span className="flex-shrink-0 mx-4 text-gray-400 text-xs">OR</span>
                    <div className="flex-grow border-t border-gray-300"></div>
                </div>

                <button
                    type="button"
                    onClick={async () => {
                        setLoading(true)
                        try {
                            const res = await apiClient.seed()
                            if (!res.error) {
                                addNotification({
                                    type: 'success',
                                    title: 'Demo Data Generated',
                                    message: 'Refresh the dashboard to see the metric tree.',
                                    duration: 5000
                                })
                            } else {
                                throw new Error(res.error)
                            }
                        } catch (err: any) {
                            addNotification({
                                type: 'error',
                                title: 'Setup Failed',
                                message: err.message || 'Failed to generate demo data',
                                duration: 5000
                            })
                        } finally {
                            setLoading(false)
                        }
                    }}
                    disabled={loading}
                    className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                    Generate Demo Data
                </button>
            </form>
        </div>
    )
}
