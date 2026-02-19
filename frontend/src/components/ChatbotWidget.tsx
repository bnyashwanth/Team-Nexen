'use client'

import { useState, useRef, useEffect, useCallback } from 'react'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'

interface ChatMessage {
    id: string
    role: 'user' | 'assistant'
    content: string
    timestamp: Date
    isStreaming?: boolean
}

const SUGGESTED_PROMPTS = [
    '📊 Summarize overall supply chain health',
    '🔍 What are the top bottlenecks?',
    '📈 How can we improve POI score?',
    '⚠️ List all critical alerts',
]

export default function ChatbotWidget() {
    const [isOpen, setIsOpen] = useState(false)
    const [messages, setMessages] = useState<ChatMessage[]>([
        {
            id: 'welcome',
            role: 'assistant',
            content: "Hi! I'm **Nexen AI** 🤖 — your supply chain copilot powered by Gemini. Ask me anything about your metrics, alerts, or performance trends.",
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
            isStreaming: true,
        }

        setMessages(prev => [...prev, userMsg, aiMsg])
        setInput('')
        setIsLoading(true)

        try {
            const response = await fetch(`${API_BASE_URL}/agent/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ message: text }),
            })

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}))
                throw new Error(errorData.error || 'Failed to connect to AI')
            }

            const reader = response.body?.getReader()
            const decoder = new TextDecoder()

            if (!reader) throw new Error('No stream reader available')

            let accumulated = ''

            while (true) {
                const { done, value } = await reader.read()
                if (done) break

                const chunk = decoder.decode(value, { stream: true })
                const lines = chunk.split('\n')

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.slice(6))
                            if (data.type === 'chunk') {
                                accumulated += data.content
                                setMessages(prev =>
                                    prev.map(m =>
                                        m.id === aiMsgId ? { ...m, content: accumulated } : m
                                    )
                                )
                            } else if (data.type === 'done') {
                                setMessages(prev =>
                                    prev.map(m =>
                                        m.id === aiMsgId ? { ...m, content: data.content, isStreaming: false } : m
                                    )
                                )
                            } else if (data.type === 'error') {
                                setMessages(prev =>
                                    prev.map(m =>
                                        m.id === aiMsgId ? { ...m, content: `⚠️ ${data.content}`, isStreaming: false } : m
                                    )
                                )
                            }
                        } catch {
                            // Skip malformed JSON
                        }
                    }
                }
            }

            setMessages(prev =>
                prev.map(m =>
                    m.id === aiMsgId ? { ...m, isStreaming: false } : m
                )
            )

            if (!isOpen) setHasUnread(true)
        } catch (err: any) {
            setMessages(prev =>
                prev.map(m =>
                    m.id === aiMsgId
                        ? { ...m, content: `⚠️ ${err.message || 'Unable to connect. Is the backend running?'}`, isStreaming: false }
                        : m
                )
            )
        } finally {
            setIsLoading(false)
        }
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
            .replace(/`(.*?)`/g, '<code style="background:rgba(99,102,241,0.15);color:#a5b4fc;padding:1px 5px;border-radius:4px;font-size:0.85em">$1</code>')
            .replace(/\n/g, '<br/>')
    }

    return (
        <>
            {/* ── Floating Action Button ── */}
            <button
                id="chatbot-fab"
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    position: 'fixed',
                    bottom: 28,
                    right: 28,
                    width: 60,
                    height: 60,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 50%, #A855F7 100%)',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 8px 32px rgba(99, 102, 241, 0.4), 0 0 0 0 rgba(99, 102, 241, 0.3)',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    zIndex: 9999,
                    animation: isOpen ? undefined : 'chatPulse 2s infinite',
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.1)'
                    e.currentTarget.style.boxShadow = '0 12px 40px rgba(99, 102, 241, 0.5)'
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)'
                    e.currentTarget.style.boxShadow = '0 8px 32px rgba(99, 102, 241, 0.4)'
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
                        background: '#EF4444',
                        border: '2px solid #0b1121',
                    }} />
                )}
            </button>

            {/* ── Chat Panel (Dark) ── */}
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
                        boxShadow: '0 25px 60px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(148,163,184,0.1)',
                        background: '#111827',
                        animation: 'chatSlideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
                        fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
                    }}
                >
                    {/* Header */}
                    <div style={{
                        background: 'linear-gradient(135deg, #312e81 0%, #4338ca 50%, #6366f1 100%)',
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
                                <div style={{ color: 'white', fontWeight: 700, fontSize: 15 }}>Nexen AI</div>
                                <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#34D399', display: 'inline-block' }} />
                                    Powered by Gemini 2.0 Flash
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
                                color: 'rgba(255,255,255,0.8)',
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
                        background: '#0f172a',
                    }}>
                        {messages.map((msg) => (
                            <div
                                key={msg.id}
                                style={{
                                    display: 'flex',
                                    justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                                    animation: 'chatFadeIn 0.3s ease-out',
                                }}
                            >
                                <div
                                    style={{
                                        maxWidth: '82%',
                                        padding: '10px 14px',
                                        borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                                        background: msg.role === 'user'
                                            ? 'linear-gradient(135deg, #6366F1, #8B5CF6)'
                                            : 'rgba(30, 41, 59, 0.8)',
                                        color: msg.role === 'user' ? 'white' : '#e2e8f0',
                                        fontSize: 13,
                                        lineHeight: 1.55,
                                        boxShadow: msg.role === 'user'
                                            ? '0 2px 8px rgba(99, 102, 241, 0.3)'
                                            : '0 1px 4px rgba(0, 0, 0, 0.2)',
                                        border: msg.role === 'user' ? 'none' : '1px solid rgba(148,163,184,0.1)',
                                    }}
                                >
                                    <div
                                        dangerouslySetInnerHTML={{ __html: formatContent(msg.content || '') }}
                                    />
                                    {msg.isStreaming && (
                                        <span style={{
                                            display: 'inline-block',
                                            width: 6,
                                            height: 14,
                                            background: '#818cf8',
                                            borderRadius: 1,
                                            marginLeft: 2,
                                            animation: 'chatBlink 0.7s infinite',
                                            verticalAlign: 'text-bottom',
                                        }} />
                                    )}
                                    <div style={{
                                        fontSize: 10,
                                        marginTop: 4,
                                        opacity: 0.4,
                                        textAlign: msg.role === 'user' ? 'right' : 'left',
                                        color: msg.role === 'user' ? 'rgba(255,255,255,0.7)' : '#64748b',
                                    }}>
                                        {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                </div>
                            </div>
                        ))}

                        {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
                            <div style={{
                                display: 'flex', gap: 6, padding: '8px 14px',
                                background: 'rgba(30, 41, 59, 0.8)', borderRadius: 16, width: 'fit-content',
                                border: '1px solid rgba(148,163,184,0.1)',
                            }}>
                                <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#64748b', animation: 'chatBounce 1.2s infinite 0s' }} />
                                <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#64748b', animation: 'chatBounce 1.2s infinite 0.15s' }} />
                                <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#64748b', animation: 'chatBounce 1.2s infinite 0.3s' }} />
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
                            background: '#0f172a',
                        }}>
                            {SUGGESTED_PROMPTS.map((prompt, i) => (
                                <button
                                    key={i}
                                    onClick={() => sendMessage(prompt)}
                                    disabled={isLoading}
                                    style={{
                                        background: 'rgba(30, 41, 59, 0.6)',
                                        border: '1px solid rgba(148,163,184,0.1)',
                                        borderRadius: 20,
                                        padding: '6px 12px',
                                        fontSize: 11,
                                        color: '#94a3b8',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                        fontWeight: 500,
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.borderColor = 'rgba(99,102,241,0.4)'
                                        e.currentTarget.style.color = '#818cf8'
                                        e.currentTarget.style.background = 'rgba(99,102,241,0.1)'
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.borderColor = 'rgba(148,163,184,0.1)'
                                        e.currentTarget.style.color = '#94a3b8'
                                        e.currentTarget.style.background = 'rgba(30, 41, 59, 0.6)'
                                    }}
                                >
                                    {prompt}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Input Bar (Dark) */}
                    <div style={{
                        padding: '12px 16px',
                        borderTop: '1px solid rgba(148,163,184,0.1)',
                        background: '#111827',
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
                            placeholder="Ask Nexen AI anything..."
                            disabled={isLoading}
                            style={{
                                flex: 1,
                                border: '1px solid rgba(148,163,184,0.15)',
                                borderRadius: 12,
                                padding: '10px 14px',
                                fontSize: 13,
                                outline: 'none',
                                transition: 'border-color 0.2s',
                                background: 'rgba(15, 23, 42, 0.6)',
                                color: '#e2e8f0',
                            }}
                            onFocus={(e) => {
                                e.currentTarget.style.borderColor = 'rgba(99,102,241,0.5)'
                                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.1)'
                            }}
                            onBlur={(e) => {
                                e.currentTarget.style.borderColor = 'rgba(148,163,184,0.15)'
                                e.currentTarget.style.boxShadow = 'none'
                            }}
                        />
                        <button
                            onClick={() => sendMessage()}
                            disabled={isLoading || !input.trim()}
                            style={{
                                width: 40,
                                height: 40,
                                borderRadius: 12,
                                border: 'none',
                                background: (isLoading || !input.trim())
                                    ? 'rgba(148,163,184,0.1)'
                                    : 'linear-gradient(135deg, #6366F1, #8B5CF6)',
                                cursor: (isLoading || !input.trim()) ? 'not-allowed' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.2s',
                                flexShrink: 0,
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
        @keyframes chatPulse {
          0%, 100% { box-shadow: 0 8px 32px rgba(99, 102, 241, 0.4), 0 0 0 0 rgba(99, 102, 241, 0.3); }
          50% { box-shadow: 0 8px 32px rgba(99, 102, 241, 0.4), 0 0 0 12px rgba(99, 102, 241, 0); }
        }
        @keyframes chatSlideUp {
          from { opacity: 0; transform: translateY(20px) scale(0.95); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes chatFadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes chatBlink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        @keyframes chatBounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
      `}</style>
        </>
    )
}
