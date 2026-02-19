import { NextResponse, type NextRequest } from 'next/server'

const ML_ENGINE_URL = process.env.ML_ENGINE_URL || 'http://localhost:5001'

interface NodeData {
    metric: string
    score?: number
    warehouse_id?: string
    status?: string
    confidence_score?: number
    poi_score?: number
    label_score?: number
    pick_score?: number
    pack_score?: number
    tt_score?: number
    oa_score?: number
    orders_volume?: number
    zone?: string
}

export async function POST(request: NextRequest) {
    try {
        const nodeData: NodeData = await request.json()

        if (!nodeData || !nodeData.metric) {
            return NextResponse.json(
                { error: 'Missing required node data' },
                { status: 400 }
            )
        }

        // Try ML engine for real root cause analysis
        let rootCauseBadge = 'Unknown'
        let aiRecommendation = 'No specific recommendation available for this metric.'
        let mlUsed = false

        try {
            const mlResponse = await fetch(`${ML_ENGINE_URL}/api/root-cause`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(nodeData)
            })

            if (mlResponse.ok) {
                const mlResult = await mlResponse.json()
                rootCauseBadge = mlResult.root_cause || rootCauseBadge
                aiRecommendation = mlResult.recommendation || aiRecommendation
                mlUsed = true
            }
        } catch (mlError) {
            console.warn('ML Engine unreachable for root cause, using fallback:', mlError)
        }

        // Fallback: mock AI agent response if ML engine is unavailable
        if (!mlUsed) {
            switch (nodeData.metric) {
                case 'efficiency_score':
                case 'label_score':
                    rootCauseBadge = 'API Failure'
                    aiRecommendation = 'Reset the North Zone courier API keys to restore label generation. Verify API authentication credentials and check rate limiting settings. Consider implementing fallback API endpoints for redundancy.'
                    break

                case 'order_processing_time':
                    rootCauseBadge = 'System Bottleneck'
                    aiRecommendation = 'Optimize database queries and implement caching for frequently accessed order data. Consider scaling processing workers during peak hours and review order validation logic for inefficiencies.'
                    break

                case 'inventory_accuracy':
                    rootCauseBadge = 'Data Sync Issue'
                    aiRecommendation = 'Reconcile inventory records with physical stock counts. Implement real-time inventory tracking systems and schedule regular synchronization between warehouse management and ERP systems.'
                    break

                case 'delivery_performance':
                    rootCauseBadge = 'Logistics Delay'
                    aiRecommendation = 'Review courier performance metrics and renegotiate SLAs. Consider diversifying shipping partners and implementing route optimization algorithms to reduce delivery times.'
                    break

                case 'staff_productivity':
                    rootCauseBadge = 'Resource Allocation'
                    aiRecommendation = 'Rebalance staff assignments based on workload distribution. Provide additional training for underperforming team members and consider implementing performance incentive programs.'
                    break

                case 'quality_control':
                    rootCauseBadge = 'Process Defect'
                    aiRecommendation = 'Review quality control checkpoints and enhance inspection protocols. Implement automated quality checks where possible and provide additional training on quality standards.'
                    break

                default:
                    if (nodeData.score !== undefined && nodeData.score < 30) {
                        rootCauseBadge = 'Critical Issue'
                        aiRecommendation = 'Immediate intervention required. Escalate to operations management and consider temporarily pausing affected processes until root cause is identified and resolved.'
                    } else if (nodeData.score !== undefined && nodeData.score < 60) {
                        rootCauseBadge = 'Performance Degradation'
                        aiRecommendation = 'Monitor the situation closely and implement preventive measures. Review recent changes to the system and consider rolling back problematic updates.'
                    }
            }
        }

        const response = {
            root_cause_badge: rootCauseBadge,
            ai_recommendation: aiRecommendation,
            node_context: nodeData,
            timestamp: new Date().toISOString(),
            confidence_score: nodeData.confidence_score || 0.85,
            ml_powered: mlUsed
        }

        return NextResponse.json(response)

    } catch (error) {
        console.error('Error in AI agent API:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
