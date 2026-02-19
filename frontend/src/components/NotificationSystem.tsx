'use client'

import { useState, useEffect, createContext, useContext, ReactNode } from 'react'

interface Notification {
    id: string
    type: 'success' | 'error' | 'warning' | 'info'
    title: string
    message?: string
    duration: number
}

interface NotificationContextType {
    notifications: Notification[]
    addNotification: (notification: Partial<Notification> & { title: string }) => string
    removeNotification: (id: string) => void
    clearAllNotifications: () => void
}

const NotificationContext = createContext<NotificationContextType | null>(null)

export function NotificationProvider({ children }: { children: ReactNode }) {
    const [notifications, setNotifications] = useState<Notification[]>([])

    const addNotification = (notification: Partial<Notification> & { title: string }): string => {
        const id = Date.now().toString()
        const newNotification: Notification = {
            id,
            type: 'info',
            duration: 5000,
            ...notification
        } as Notification

        setNotifications(prev => [...prev, newNotification])

        // Auto remove after duration
        if (newNotification.duration > 0) {
            setTimeout(() => {
                removeNotification(id)
            }, newNotification.duration)
        }

        return id
    }

    const removeNotification = (id: string) => {
        setNotifications(prev => prev.filter(n => n.id !== id))
    }

    const clearAllNotifications = () => {
        setNotifications([])
    }

    return (
        <NotificationContext.Provider value={{
            notifications,
            addNotification,
            removeNotification,
            clearAllNotifications
        }}>
            {children}
        </NotificationContext.Provider>
    )
}

export function useNotifications(): NotificationContextType {
    const context = useContext(NotificationContext)
    if (!context) {
        throw new Error('useNotifications must be used within a NotificationProvider')
    }
    return context
}

export function NotificationContainer() {
    const { notifications, removeNotification } = useNotifications()

    return (
        <div className="fixed top-4 right-4 z-50 space-y-3 pointer-events-none">
            {notifications.map(notification => (
                <div
                    key={notification.id}
                    className="pointer-events-auto max-w-sm w-full bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden transform transition-all duration-300 ease-in-out hover:shadow-xl"
                >
                    <div className={`p-4 flex items-start gap-3 border-l-4 ${notification.type === 'success' ? 'border-green-500' :
                            notification.type === 'error' ? 'border-red-500' :
                                notification.type === 'warning' ? 'border-yellow-500' :
                                    'border-blue-600'
                        }`}>
                        {/* Icon */}
                        <div className="flex-shrink-0">
                            {notification.type === 'success' && (
                                <div className="h-6 w-6 rounded-full bg-green-100 flex items-center justify-center">
                                    <svg className="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                            )}
                            {notification.type === 'error' && (
                                <div className="h-6 w-6 rounded-full bg-red-100 flex items-center justify-center">
                                    <svg className="h-4 w-4 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </div>
                            )}
                            {notification.type === 'warning' && (
                                <div className="h-6 w-6 rounded-full bg-yellow-100 flex items-center justify-center">
                                    <svg className="h-4 w-4 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    </svg>
                                </div>
                            )}
                            {notification.type === 'info' && (
                                <div className="h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center">
                                    <svg className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                            )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900">
                                {notification.title}
                            </p>
                            {notification.message && (
                                <p className="mt-1 text-sm text-gray-500 leading-relaxed">
                                    {notification.message}
                                </p>
                            )}
                        </div>

                        {/* Close Button */}
                        <button
                            onClick={() => removeNotification(notification.id)}
                            className="flex-shrink-0 ml-2 rounded-md p-1 hover:bg-gray-50 focus:outline-none transition-colors"
                        >
                            <span className="sr-only">Close</span>
                            <svg className="h-4 w-4 text-gray-400 hover:text-gray-600" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                        </button>
                    </div>
                    {/* Progress bar/Time indicator could go here if duration is set */}
                </div>
            ))}
        </div>
    )
}
