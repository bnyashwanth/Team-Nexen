'use client'

import { useState, useRef, useEffect } from 'react'
import { apiClient, type MetricData, type AgentResponse } from '@/lib/api'

interface Message {
    id: string
    role: 'user' | 'assistant'
    content: string
    timestamp: string
    rootCauseBadge?: string
}

interface AICopilotSidebarProps {
    isOpen: boolean
    onClose: () => void
    selectedNode: MetricData | null
    warehouseId: string
}

export default function AICopilotSidebar({
    isOpen,
    onClose,
    selectedNode,
    warehouseId,
}: AICopilotSidebarProps) {
    const [messages, setMessages] = useState<Message[]>([])
    const [input, setInput] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const messagesEndRef = useRef<HTMLDivElement>(null)

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }

    useEffect(() => {
        scrollToBottom()
    }, [messages])

    // When a node is selected, automatically analyze it
    useEffect(() => {
        if (selectedNode && isOpen) {
            const analysisMessage = `Analyze ${selectedNode.metricId || 'this metric'} — current score: ${selectedNode.score}%, status: ${selectedNode.status}`
            handleSendMessage(analysisMessage, selectedNode)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedNode])

    const handleSendMessage = async (messageText?: string, contextData?: MetricData) => {
        const text = messageText || input.trim()
        if (!text || isLoading) return

        const userMessage: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: text,
            timestamp: new Date().toISOString(),
        }

        setMessages(prev => [...prev, userMessage])
        setInput('')
        setIsLoading(true)

        try {
            const result = await apiClient.askAgent(
                text,
                contextData?.metricId || selectedNode?.metricId,
                contextData || selectedNode || undefined
            )

            if (result.data) {
                const aiMessage: Message = {
                    id: (Date.now() + 1).toString(),
                    role: 'assistant',
                    content: result.data.response || 'Analysis complete.',
                    timestamp: result.data.timestamp || new Date().toISOString(),
                }
                setMessages(prev => [...prev, aiMessage])
            } else {
                setMessages(prev => [...prev, {
                    id: (Date.now() + 1).toString(),
                    role: 'assistant',
                    content: `Error: ${result.error || 'Failed to get AI analysis'}`,
                    timestamp: new Date().toISOString(),
                }])
            }
        } catch (error) {
            setMessages(prev => [...prev, {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: 'Unable to connect to the AI agent. Please check your backend connection.',
                timestamp: new Date().toISOString(),
            }])
        } finally {
            setIsLoading(false)
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSendMessage()
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-y-0 right-0 w-96 bg-white shadow-xl border-l border-gray-200 flex flex-col z-50">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-sm">🤖</span>
                    </div>
                    <div>
                        <h2 className="text-sm font-semibold text-gray-900">AI Copilot</h2>
                        <p className="text-xs text-gray-500">Supply Chain Analysis</p>
                    </div>
                </div>
                <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            {/* Context Banner */}
            {selectedNode && (
                <div className={`px-4 py-2 text-xs ${selectedNode.status === 'critical' ? 'bg-red-50 text-red-700' :
                        selectedNode.status === 'warn' ? 'bg-yellow-50 text-yellow-700' :
                            'bg-green-50 text-green-700'
                    }`}>
                    <div className="font-medium">📊 Analyzing: {selectedNode.metricId || 'Metric'}</div>
                    <div>Score: {selectedNode.score}% | Status: {selectedNode.status}</div>
                </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 && (
                    <div className="text-center text-gray-400 mt-8">
                        <div className="text-3xl mb-2">🤖</div>
                        <p className="text-sm">Click on an anomalous metric node to start analysis, or type a question below.</p>
                    </div>
                )}
                {messages.map((message) => (
                    <div
                        key={message.id}
                        className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                        <div
                            className={`max-w-[80%] rounded-lg p-3 text-sm ${message.role === 'user'
                                    ? 'bg-blue-500 text-white rounded-br-none'
                                    : 'bg-gray-100 text-gray-800 rounded-bl-none'
                                }`}
                        >
                            {message.rootCauseBadge && (
                                <span className="inline-block bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded-full mb-1">
                                    {message.rootCauseBadge}
                                </span>
                            )}
                            <p className="whitespace-pre-wrap">{message.content}</p>
                            <p className={`text-xs mt-1 ${message.role === 'user' ? 'text-blue-200' : 'text-gray-400'}`}>
                                {new Date(message.timestamp).toLocaleTimeString()}
                            </p>
                        </div>
                    </div>
                ))}
                {isLoading && (
                    <div className="flex justify-start">
                        <div className="bg-gray-100 rounded-lg p-3">
                            <div className="flex space-x-1">
                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                            </div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="border-t border-gray-200 p-4">
                <div className="flex space-x-2">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Ask about supply chain metrics..."
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        disabled={isLoading}
                    />
                    <button
                        onClick={() => handleSendMessage()}
                        disabled={isLoading || !input.trim()}
                        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    )
}
