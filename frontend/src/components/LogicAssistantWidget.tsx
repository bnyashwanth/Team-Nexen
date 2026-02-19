'use client'

import { useState, useRef, useEffect, useCallback } from 'react'

interface ChatMessage {
    id: string
    role: 'user' | 'assistant'
    content: string
    timestamp: Date
}

const LOGIC_RESPONSES = {
    'health': '📊 **Supply Chain Health**: Overall system status is **Healthy** with 94.2% POI score. Key metrics: On-time delivery at 87%, inventory levels optimal, and 3 active alerts requiring attention.',
    'bottleneck': '🔍 **Top Bottlenecks**: 1) Port congestion at Shanghai (2.3 day delay), 2) Limited truck capacity in Midwest region, 3) Customs processing delays at LAX. Recommended actions: Consider alternative routes and increase buffer stock.',
    'poi': '📈 **POI Score Improvement**: Current POI: 94.2%. To improve: 1) Reduce transit time variability by 15%, 2) Optimize warehouse picking processes, 3) Implement predictive demand forecasting. Target: 96% within 30 days.',
    'alerts': '⚠️ **Critical Alerts**: 2 critical alerts active: 1) Temperature excursion in cold chain shipment #A2B4, 2) Customs hold for container #X9Y7. 3 warning alerts: Low fuel levels, ETA delays, quality check pending.',
    'metrics': '📊 **Key Metrics**: On-time delivery: 87%, POI score: 94.2%, Inventory turnover: 8.2, Order accuracy: 98.5%, Carrier performance: 91%. All metrics within acceptable ranges.',
    'performance': '🚀 **Performance Summary**: Excellent performance this week. 1,247 shipments processed, 98.3% on-time, 0.8% damage rate, customer satisfaction at 4.6/5.0. Top performing route: Asia-Pacific corridor.',
    'default': '🤖 **Nexen Assistant**: I can help you with supply chain metrics, alerts, performance analysis, and operational insights. Ask me about health status, bottlenecks, POI scores, or specific metrics!'
}

const SUGGESTED_PROMPTS = [
    '📊 Supply chain health status',
    '🔍 Current bottlenecks',
    '📈 POI score analysis',
    '⚠️ Active alerts',
    '🚀 Performance summary'
]

export default function LogicAssistantWidget() {
    const [isOpen, setIsOpen] = useState(false)
    const [messages, setMessages] = useState<ChatMessage[]>([
        {
            id: 'welcome',
            role: 'assistant',
            content: "Hi! I'm **Nexen Assistant** 🤖 — your supply chain intelligence copilot. I provide real-time insights based on your operational data. Ask me anything about metrics, alerts, or performance!",
            timestamp: new Date(),
        },
    ])
    const [input, setInput] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [hasUnread, setHasUnread] = useState(false)
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)

    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [])

    useEffect(() => {
        scrollToBottom()
    }, [messages, scrollToBottom])

    useEffect(() => {
        if (isOpen) {
            setHasUnread(false)
            setTimeout(() => inputRef.current?.focus(), 200)
        }
    }, [isOpen])

    const generateLogicResponse = (userInput: string): string => {
        const lowerInput = userInput.toLowerCase()
        
        // Check for keywords and return appropriate responses
        for (const [key, response] of Object.entries(LOGIC_RESPONSES)) {
            if (lowerInput.includes(key)) {
                return response
            }
        }
        
        // Check for specific patterns
        if (lowerInput.includes('how') && lowerInput.includes('improve')) {
            return LOGIC_RESPONSES.poi
        }
        if (lowerInput.includes('what') && (lowerInput.includes('status') || lowerInput.includes('health'))) {
            return LOGIC_RESPONSES.health
        }
        if (lowerInput.includes('alert') || lowerInput.includes('warning')) {
            return LOGIC_RESPONSES.alerts
        }
        if (lowerInput.includes('metric') || lowerInput.includes('kpi')) {
            return LOGIC_RESPONSES.metrics
        }
        if (lowerInput.includes('performance') || lowerInput.includes('summary')) {
            return LOGIC_RESPONSES.performance
        }
        
        return LOGIC_RESPONSES.default
    }

    const sendMessage = async (messageText?: string) => {
        const text = messageText || input.trim()
        if (!text || isLoading) return

        const userMsg: ChatMessage = {
            id: `user-${Date.now()}`,
            role: 'user',
            content: text,
            timestamp: new Date(),
        }

        const aiMsgId = `ai-${Date.now()}`
        const aiMsg: ChatMessage = {
            id: aiMsgId,
            role: 'assistant',
            content: '',
            timestamp: new Date(),
        }

        setMessages(prev => [...prev, userMsg, aiMsg])
        setInput('')
        setIsLoading(true)

        // Simulate processing delay for better UX
        await new Promise(resolve => setTimeout(resolve, 800))

        const response = generateLogicResponse(text)
        
        setMessages(prev =>
            prev.map(m =>
                m.id === aiMsgId ? { ...m, content: response } : m
            )
        )

        setIsLoading(false)
        if (!isOpen) setHasUnread(true)
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            sendMessage()
        }
    }

    const clearChat = () => {
        setMessages([
            {
                id: 'welcome',
                role: 'assistant',
                content: "Chat cleared! I'm ready for new questions. 🤖",
                timestamp: new Date(),
            },
        ])
    }

    const formatContent = (text: string) => {
        return text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/`(.*?)`/g, '<code style="background:rgba(30,64,175,0.15);color:#60a5fa;padding:1px 5px;border-radius:4px;font-size:0.85em">$1</code>')
            .replace(/\n/g, '<br/>')
    }

    return (
        <>
            {/* ── Floating Action Button ── */}
            <button
                id="assistant-fab"
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    position: 'fixed',
                    bottom: 28,
                    right: 28,
                    width: 60,
                    height: 60,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #64748b 0%, #475569 50%, #334155 100%)',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 8px 32px rgba(100, 116, 139, 0.4), 0 0 0 0 rgba(100, 116, 139, 0.3)',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    zIndex: 9999,
                    animation: isOpen ? undefined : 'assistantPulse 2s infinite',
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.1)'
                    e.currentTarget.style.boxShadow = '0 12px 40px rgba(100, 116, 139, 0.5)'
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)'
                    e.currentTarget.style.boxShadow = '0 8px 32px rgba(100, 116, 139, 0.4)'
                }}
            >
                {isOpen ? (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                        <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                ) : (
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
                        <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17L4 17.17V4h16v12z" />
                        <path d="M7 9h2v2H7zm4 0h2v2h-2zm4 0h2v2h-2z" />
                    </svg>
                )}

                {/* Unread badge */}
                {hasUnread && !isOpen && (
                    <span style={{
                        position: 'absolute',
                        top: -2,
                        right: -2,
                        width: 16,
                        height: 16,
                        borderRadius: '50%',
                        background: '#dc2626',
                        border: '2px solid #ffffff',
                    }} />
                )}
            </button>

            {/* ── Chat Panel (Professional Blue Theme) ── */}
            {isOpen && (
                <div
                    style={{
                        position: 'fixed',
                        bottom: 100,
                        right: 28,
                        width: 420,
                        height: 580,
                        borderRadius: 20,
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column',
                        zIndex: 9998,
                        boxShadow: '0 25px 60px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(100, 116, 139, 0.1)',
                        background: '#ffffff',
                        animation: 'assistantSlideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
                        fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
                    }}
                >
                    {/* Header */}
                    <div style={{
                        background: 'linear-gradient(135deg, #64748b 0%, #475569 50%, #334155 100%)',
                        padding: '16px 20px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{
                                width: 38,
                                height: 38,
                                borderRadius: 12,
                                background: 'rgba(255,255,255,0.15)',
                                backdropFilter: 'blur(8px)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: 20,
                            }}>
                                🤖
                            </div>
                            <div>
                                <div style={{ color: 'white', fontWeight: 700, fontSize: 15 }}>Nexen Assistant</div>
                                <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#34d399', display: 'inline-block' }} />
                                    Logic-Based Intelligence
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={clearChat}
                            title="Clear chat"
                            style={{
                                background: 'rgba(255,255,255,0.1)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: 8,
                                padding: '6px 10px',
                                cursor: 'pointer',
                                color: 'rgba(255,255,255,0.9)',
                                fontSize: 11,
                                fontWeight: 600,
                                transition: 'all 0.2s',
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.2)' }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)' }}
                        >
                            🗑️ Clear
                        </button>
                    </div>

                    {/* Messages */}
                    <div style={{
                        flex: 1,
                        overflowY: 'auto',
                        padding: '16px 16px 8px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 12,
                        background: '#f8fafc',
                    }}>
                        {messages.map((msg) => (
                            <div
                                key={msg.id}
                                style={{
                                    display: 'flex',
                                    justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                                    animation: 'assistantFadeIn 0.3s ease-out',
                                }}
                            >
                                <div
                                    style={{
                                        maxWidth: '82%',
                                        padding: '12px 16px',
                                        borderRadius: msg.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                                        background: msg.role === 'user'
                                            ? 'linear-gradient(135deg, #1e40af, #1d4ed8)'
                                            : '#ffffff',
                                        color: msg.role === 'user' ? 'white' : '#1e293b',
                                        fontSize: 13,
                                        lineHeight: 1.6,
                                        boxShadow: msg.role === 'user'
                                            ? '0 2px 12px rgba(30, 64, 175, 0.3)'
                                            : '0 1px 4px rgba(0, 0, 0, 0.05)',
                                        border: msg.role === 'user' ? 'none' : '1px solid rgba(226, 232, 240, 0.8)',
                                    }}
                                >
                                    <div
                                        dangerouslySetInnerHTML={{ __html: formatContent(msg.content || '') }}
                                    />
                                    <div style={{
                                        fontSize: 10,
                                        marginTop: 6,
                                        opacity: 0.6,
                                        textAlign: msg.role === 'user' ? 'right' : 'left',
                                        color: msg.role === 'user' ? 'rgba(255,255,255,0.8)' : '#64748b',
                                    }}>
                                        {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                </div>
                            </div>
                        ))}

                        {isLoading && (
                            <div style={{
                                display: 'flex', gap: 6, padding: '12px 16px',
                                background: '#ffffff', borderRadius: 18, width: 'fit-content',
                                border: '1px solid rgba(226, 232, 240, 0.8)',
                            }}>
                                <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#64748b', animation: 'assistantBounce 1.2s infinite 0s' }} />
                                <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#64748b', animation: 'assistantBounce 1.2s infinite 0.15s' }} />
                                <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#64748b', animation: 'assistantBounce 1.2s infinite 0.3s' }} />
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Suggested Prompts */}
                    {messages.length <= 1 && (
                        <div style={{
                            padding: '0 16px 8px',
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: 6,
                            background: '#f8fafc',
                        }}>
                            {SUGGESTED_PROMPTS.map((prompt, i) => (
                                <button
                                    key={i}
                                    onClick={() => sendMessage(prompt)}
                                    disabled={isLoading}
                                    style={{
                                        background: '#ffffff',
                                        border: '1px solid rgba(100, 116, 139, 0.15)',
                                        borderRadius: 20,
                                        padding: '6px 12px',
                                        fontSize: 11,
                                        color: '#64748b',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                        fontWeight: 500,
                                    }}
                                    onMouseEnter={(e) => {
                                        borderColor: 'rgba(100, 116, 139, 0.4)'
                                        e.currentTarget.style.background = 'rgba(100, 116, 139, 0.05)'
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.borderColor = 'rgba(100, 116, 139, 0.15)'
                                        e.currentTarget.style.background = '#ffffff'
                                    }}
                                >
                                    {prompt}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Input Bar */}
                    <div style={{
                        padding: '12px 16px',
                        borderTop: '1px solid rgba(226, 232, 240, 0.8)',
                        background: '#ffffff',
                        display: 'flex',
                        gap: 8,
                        alignItems: 'center',
                    }}>
                        <input
                            ref={inputRef}
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Ask about supply chain metrics..."
                            disabled={isLoading}
                            style={{
                                flex: 1,
                                border: '1px solid rgba(226, 232, 240, 0.8)',
                                borderRadius: 12,
                                padding: '10px 14px',
                                fontSize: 13,
                                outline: 'none',
                                transition: 'all 0.2s',
                                background: '#f8fafc',
                                color: '#1e293b',
                            }}
                            onFocus={(e) => {
                                e.currentTarget.style.borderColor = 'rgba(100, 116, 139, 0.4)'
                                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(100, 116, 139, 0.1)'
                                e.currentTarget.style.background = '#ffffff'
                            }}
                            onBlur={(e) => {
                                e.currentTarget.style.borderColor = 'rgba(226, 232, 240, 0.8)'
                                e.currentTarget.style.boxShadow = 'none'
                                e.currentTarget.style.background = '#f8fafc'
                            }}
                        />
                        <button
                            onClick={() => sendMessage()}
                            disabled={isLoading || !input.trim()}
                            style={{
                                width: 40,
                            }}
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="white" stroke="none">
                                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                            </svg>
                        </button>
                    </div>
                </div>
            )}

            {/* ── Keyframe Animations ── */}
            <style jsx global>{`
        @keyframes assistantPulse {
          0%, 100% { box-shadow: 0 8px 32px rgba(100, 116, 139, 0.4), 0 0 0 0 rgba(100, 116, 139, 0.3); }
          50% { box-shadow: 0 8px 32px rgba(100, 116, 139, 0.4), 0 0 0 12px rgba(100, 116, 139, 0); }
        }
        @keyframes assistantSlideUp {
          from { opacity: 0; transform: translateY(20px) scale(0.95); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes assistantFadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes assistantBounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
      `}</style>
        </>
    )
}
