import { ReactNode } from 'react'

export const metadata = {
    title: 'Supply Chain Metric Tree',
    description: 'Real-time supply chain metrics visualization with AI anomaly detection',
}

export default function DashboardLayout({
    children,
}: {
    children: ReactNode
}) {
    return (
        <div className="min-h-screen bg-gray-50">
            <nav className="bg-white shadow-sm border-b">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16">
                        <div className="flex items-center">
                            <h1 className="text-xl font-semibold text-gray-900">Metric Tree Dashboard</h1>
                        </div>
                        <div className="flex items-center space-x-4">
                            <a href="/admin" className="text-gray-600 hover:text-gray-900">
                                Admin Portal
                            </a>
                        </div>
                    </div>
                </div>
            </nav>
            <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                {children}
            </main>
        </div>
    )
}
