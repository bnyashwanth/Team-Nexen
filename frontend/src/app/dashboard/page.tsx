'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import MetricTree from '@/components/MetricTree'
import AICopilotSidebar from '@/components/AICopilotSidebar'
import { apiClient, type User, type Warehouse, type MetricSnapshot } from '@/lib/api'
import { useNotifications } from '@/components/NotificationSystem'

export default function DashboardPage() {
  const router = useRouter()
  const [metrics, setMetrics] = useState<MetricSnapshot[]>([])
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(true)
  const [selectedNode, setSelectedNode] = useState<any>(null)
  const [user, setUser] = useState<User | null>(null)
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
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to load warehouse data',
        duration: 5000
      })
    }
  }

  const handleLogout = async () => {
    try {
      await apiClient.logout()
      addNotification({
        type: 'info',
        title: 'Logged Out',
        message: 'You have been successfully logged out',
        duration: 3000
      })
      setTimeout(() => router.push('/login'), 1000)
    } catch (error) {
      console.error('Logout error:', error)
      addNotification({
        type: 'error',
        title: 'Logout Failed',
        message: 'An error occurred during logout',
        duration: 5000
      })
    }
  }

  if (loading) {
    return (
      <div className="px-4 py-6 sm:px-0">
        {/* Header Skeleton */}
        <div className="mb-6 flex justify-between items-start">
          <div className="flex-1">
            <div className="h-8 bg-gray-200 rounded-lg animate-pulse mb-2 w-64"></div>
            <div className="h-4 bg-gray-200 rounded animate-pulse w-96"></div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="h-10 bg-gray-200 rounded animate-pulse w-32"></div>
            <div className="h-16 bg-gray-200 rounded animate-pulse w-24"></div>
          </div>
        </div>

        {/* Metric Tree Skeleton */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="h-96 bg-gray-200 rounded-lg animate-pulse"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 py-6 sm:px-0">
      {/* Header with user info and warehouse selector */}
      <div className="mb-6 flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Supply Chain Metric Tree
          </h2>
          <p className="text-gray-600">
            Real-time visualization of warehouse performance metrics
          </p>
        </div>

        <div className="flex items-center space-x-4">
          {/* Warehouse Selector */}
          <div>
            <label htmlFor="warehouse-select" className="block text-sm font-medium text-gray-700 mb-1">
              Warehouse
            </label>
            <select
              id="warehouse-select"
              value={selectedWarehouse}
              onChange={(e) => handleWarehouseChange(e.target.value)}
              className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
            >
              {warehouses.map((warehouse: any) => (
                <option key={warehouse.id || warehouse._id} value={warehouse.id || warehouse._id}>
                  {warehouse.name} ({warehouse.zone})
                </option>
              ))}
            </select>
          </div>

          {/* User Info */}
          <div className="text-right">
            <div className="text-sm font-medium text-gray-900">{user?.name}</div>
            <div className="text-xs text-gray-500">{user?.role}</div>
            <button
              onClick={handleLogout}
              className="text-xs text-blue-600 hover:text-blue-800 mt-1"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Metric Tree */}
      <div className="bg-white rounded-lg shadow p-6">
        <MetricTree
          data={metrics}
          onNodeSelect={setSelectedNode}
          selectedWarehouse={selectedWarehouse}
        />
      </div>

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
