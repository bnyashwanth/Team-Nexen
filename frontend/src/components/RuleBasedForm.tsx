'use client'

import { useState } from 'react'

interface RuleResult {
  score: number
  status: 'excellent' | 'good' | 'warning' | 'critical'
  recommendations: string[]
  timestamp: string
}

interface RuleBasedFormProps {
  onRuleEvaluated: (result: RuleResult) => void
}

interface Rule {
  metric: string
  threshold: {
    excellent: number
    good: number
    warning: number
  }
  recommendations: {
    excellent: string[]
    good: string[]
    warning: string[]
    critical: string[]
  }
}

const RULES: Record<string, Rule> = {
  poi: {
    metric: 'POI Score',
    threshold: { excellent: 95, good: 85, warning: 75 },
    recommendations: {
      excellent: ['Maintain current performance levels', 'Share best practices with other warehouses'],
      good: ['Optimize picking routes', 'Review staff allocation'],
      warning: ['Implement performance improvement plan', 'Increase training frequency'],
      critical: ['Immediate intervention required', 'Consider external consultancy']
    }
  },
  otd: {
    metric: 'On-Time Delivery',
    threshold: { excellent: 98, good: 92, warning: 85 },
    recommendations: {
      excellent: ['Maintain current logistics', 'Document successful processes'],
      good: ['Optimize delivery routes', 'Improve scheduling'],
      warning: ['Review carrier performance', 'Address bottlenecks'],
      critical: ['Emergency logistics review', 'Consider backup carriers']
    }
  },
  wpt: {
    metric: 'Warehouse Processing Time',
    threshold: { excellent: 95, good: 85, warning: 75 },
    recommendations: {
      excellent: ['Maintain efficient workflows', 'Cross-train staff'],
      good: ['Optimize layout', 'Implement automation where possible'],
      warning: ['Review process inefficiencies', 'Reduce manual steps'],
      critical: ['Complete process redesign', 'Consider warehouse relocation']
    }
  },
  oa: {
    metric: 'Order Accuracy',
    threshold: { excellent: 99, good: 95, warning: 90 },
    recommendations: {
      excellent: ['Continue quality controls', 'Maintain staff training'],
      good: ['Enhance verification steps', 'Implement double-check system'],
      warning: ['Improve training programs', 'Review picking accuracy procedures'],
      critical: ['Overhaul quality system', 'Implement real-time verification']
    }
  },
  dfr: {
    metric: 'Damage Free Rate',
    threshold: { excellent: 99, good: 95, warning: 90 },
    recommendations: {
      excellent: ['Maintain packaging standards', 'Continue handling training'],
      good: ['Review packaging materials', 'Improve handling procedures'],
      warning: ['Enhance protective measures', 'Staff retraining required'],
      critical: ['Immediate packaging overhaul', 'Consider insurance impact']
    }
  }
}

export default function RuleBasedForm({ onRuleEvaluated }: RuleBasedFormProps) {
  const [formData, setFormData] = useState({
    warehouse_id: '',
    metric_id: '',
    current_value: 0
  })
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<RuleResult | null>(null)
  const [error, setError] = useState('')

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: name === 'current_value' 
        ? parseFloat(value) || 0 
        : value
    }))
  }

  const evaluateRules = () => {
    if (!formData.metric_id || formData.current_value <= 0) {
      setError('Please select a metric and enter a valid value')
      return
    }

    setLoading(true)
    setError('')
    setResult(null)

    try {
      const rule = RULES[formData.metric_id]
      if (!rule) {
        throw new Error('Invalid metric selected')
      }

      const { threshold, recommendations } = rule
      let status: RuleResult['status']
      let score: number

      if (formData.current_value >= threshold.excellent) {
        status = 'excellent'
        score = 95 + Math.min((formData.current_value - threshold.excellent) * 0.5, 5)
      } else if (formData.current_value >= threshold.good) {
        status = 'good'
        score = 80 + (formData.current_value - threshold.good) * 0.3
      } else if (formData.current_value >= threshold.warning) {
        status = 'warning'
        score = 60 + (formData.current_value - threshold.warning) * 0.4
      } else {
        status = 'critical'
        score = Math.max(20, formData.current_value * 0.6)
      }

      const ruleResult: RuleResult = {
        score: Math.round(score * 100) / 100,
        status,
        recommendations: recommendations[status],
        timestamp: new Date().toISOString()
      }

      setResult(ruleResult)
      onRuleEvaluated(ruleResult)
    } catch (err: any) {
      setError(err.message || 'Failed to evaluate rules')
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: RuleResult['status']) => {
    switch (status) {
      case 'excellent': return 'text-emerald-600 bg-emerald-50 border-emerald-200'
      case 'good': return 'text-blue-600 bg-blue-50 border-blue-200'
      case 'warning': return 'text-amber-600 bg-amber-50 border-amber-200'
      case 'critical': return 'text-red-600 bg-red-50 border-red-200'
    }
  }

  const getStatusIcon = (status: RuleResult['status']) => {
    switch (status) {
      case 'excellent': return '🌟'
      case 'good': return '✅'
      case 'warning': return '⚠️'
      case 'critical': return '🚨'
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Rule-Based Performance Evaluator</h3>
        <p className="text-sm text-gray-600">
          Evaluate warehouse metrics using predefined business rules and thresholds.
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
            Metric Type
          </label>
          <select
            name="metric_id"
            value={formData.metric_id}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="">Select Metric</option>
            <option value="poi">POI Score (%)</option>
            <option value="otd">On-Time Delivery (%)</option>
            <option value="wpt">Warehouse Processing Time (%)</option>
            <option value="oa">Order Accuracy (%)</option>
            <option value="dfr">Damage Free Rate (%)</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Current Value
          </label>
          <input
            type="number"
            name="current_value"
            value={formData.current_value}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="0.00"
            step="0.01"
            min="0"
            max="100"
          />
        </div>
      </div>

      {formData.metric_id && RULES[formData.metric_id] && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <h4 className="text-sm font-semibold text-gray-900 mb-3">Performance Thresholds</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div className="text-center">
              <div className="font-semibold text-emerald-600">Excellent</div>
              <div className="text-gray-600">≥ {RULES[formData.metric_id].threshold.excellent}%</div>
            </div>
            <div className="text-center">
              <div className="font-semibold text-blue-600">Good</div>
              <div className="text-gray-600">≥ {RULES[formData.metric_id].threshold.good}%</div>
            </div>
            <div className="text-center">
              <div className="font-semibold text-amber-600">Warning</div>
              <div className="text-gray-600">≥ {RULES[formData.metric_id].threshold.warning}%</div>
            </div>
            <div className="text-center">
              <div className="font-semibold text-red-600">Critical</div>
              <div className="text-gray-600">&lt; {RULES[formData.metric_id].threshold.warning}%</div>
            </div>
          </div>
        </div>
      )}

      <button
        onClick={evaluateRules}
        disabled={loading}
        className="w-full bg-indigo-600 text-white py-3 px-4 rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
      >
        {loading ? 'Evaluating...' : 'Evaluate Performance'}
      </button>

      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {result && (
        <div className="mt-6 space-y-4">
          <div className={`p-6 rounded-xl border ${getStatusColor(result.status)}`}>
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-semibold">Performance Evaluation Result</h4>
              <span className="text-2xl">{getStatusIcon(result.status)}</span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="bg-white bg-opacity-60 p-4 rounded-lg">
                <p className="text-sm font-medium mb-1">Score</p>
                <p className="text-3xl font-bold">{result.score}</p>
              </div>
              <div className="bg-white bg-opacity-60 p-4 rounded-lg">
                <p className="text-sm font-medium mb-1">Status</p>
                <p className="text-xl font-bold capitalize">{result.status}</p>
              </div>
            </div>
          </div>

          <div className="p-6 bg-blue-50 border border-blue-200 rounded-xl">
            <h4 className="text-lg font-semibold text-blue-900 mb-4">Recommendations</h4>
            <ul className="space-y-2">
              {result.recommendations.map((rec, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-blue-600 mt-1">•</span>
                  <span className="text-sm text-blue-800">{rec}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="text-xs text-gray-500 text-center">
            Evaluated at: {new Date(result.timestamp).toLocaleString()}
          </div>
        </div>
      )}
    </div>
  )
}
