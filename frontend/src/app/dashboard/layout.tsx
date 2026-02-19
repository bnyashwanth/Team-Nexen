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
        <div className="min-h-screen bg-slate-50">
            {children}
        </div>
    )
}
