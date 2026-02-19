import { ReactNode } from 'react'

export const metadata = {
    title: 'Admin Portal - Supply Chain Metrics',
    description: 'Admin portal for entering warehouse metrics',
}

export default function AdminLayout({
    children,
}: {
    children: ReactNode
}) {
    return (
        <div className="min-h-screen bg-gray-50">
            <nav className="bg-white shadow-sm border-b">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16">
                        <div className="flex items-center space-x-3">
                            <h1 className="text-xl font-semibold text-gray-900">Admin Portal</h1>
                        </div>
                        <div className="flex items-center space-x-4">
                            <a href="/login" className="text-gray-600 hover:text-gray-900">
                                Login
                            </a>
                            <a href="/signup" className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
                                Sign Up
                            </a>
                            <a href="/" className="text-gray-600 hover:text-gray-900">
                                Dashboard
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
