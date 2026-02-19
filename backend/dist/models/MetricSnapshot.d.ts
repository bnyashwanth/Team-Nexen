import mongoose, { Document } from 'mongoose';
interface IMetricSnapshot extends Document {
    warehouseId: string;
    timestamp: Date;
    metricTree: Record<string, any>;
    rootScore: number;
    rootStatus: 'healthy' | 'warn' | 'critical';
}
declare const MetricSnapshot: mongoose.Model<IMetricSnapshot, {}, {}, {}, mongoose.Document<unknown, {}, IMetricSnapshot, {}, {}> & IMetricSnapshot & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default MetricSnapshot;
//# sourceMappingURL=MetricSnapshot.d.ts.map