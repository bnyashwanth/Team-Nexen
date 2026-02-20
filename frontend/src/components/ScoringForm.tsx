'use client'

import { useState } from 'react'

interface ScoreData {
  rolling_7d_avg: number
  timestamp: string
}

interface ScoringFormProps {
  onDataSaved: (data: ScoreData) => void
}

export default function ScoringForm({ onDataSaved }: ScoringFormProps) {
  const [formData, setFormData] = useState({
    warehouse_id: '',
    metric_id: '',
    rolling_7d_avg: 0
  })
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ScoreData | null>(null)
  const [error, setError] = useState('')

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: name === 'rolling_7d_avg' 
        ? parseFloat(value) || 0 
        : value
    }))
  }

  const saveData = async () => {
    setLoading(true)
    setError('')
    setResult(null)

    try {
      // Simulate saving data
      const savedData: ScoreData = {
        rolling_7d_avg: formData.rolling_7d_avg,
        timestamp: new Date().toISOString()
      }
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      setResult(savedData)
      onDataSaved(savedData)
    } catch (err: any) {
      setError(err.message || 'Failed to save data')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Rolling 7-Day Average</h3>
        <p className="text-sm text-gray-600">
          Save rolling 7-day average data for warehouse metrics.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Warehouse ID
          </label>
          <input
            type="text"
            name="warehouse_id"
            value={formData.warehouse_id}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="WH001"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Metric ID
          </label>
          <select
            name="metric_id"
            value={formData.metric_id}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="">Select Metric</option>
            <option value="poi">POI Score</option>
            <option value="otd">On-Time Delivery</option>
            <option value="wpt">Warehouse Processing Time</option>
            <option value="oa">Order Accuracy</option>
            <option value="dfr">Damage Free Rate</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Rolling 7-Day Average
          </label>
          <input
            type="number"
            name="rolling_7d_avg"
            value={formData.rolling_7d_avg}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="0.00"
            step="0.01"
            min="0"
          />
        </div>
      </div>

      <button
        onClick={saveData}
        disabled={loading}
        className="w-full bg-indigo-600 text-white py-3 px-4 rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
      >
        {loading ? 'Saving...' : 'Save Data'}
      </button>

      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {result && (
        <div className="mt-6 p-6 bg-green-50 border border-green-200 rounded-xl">
          <h4 className="text-lg font-semibold text-green-900 mb-4">Data Saved Successfully!</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <p className="text-sm text-gray-600 mb-1">Rolling 7-Day Average</p>
              <p className="text-2xl font-bold text-green-600">{result.rolling_7d_avg.toFixed(2)}</p>
            </div>
            
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <p className="text-sm text-gray-600 mb-1">Saved At</p>
              <p className="text-sm font-medium text-gray-900">
                {new Date(result.timestamp).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
