import mongoose, { Document } from 'mongoose';
interface IMetricDefinition extends Document {
    metricId: string;
    name: string;
    parentId: string | null;
    impactWeight: number;
    thresholds: {
        warn: number;
        crit: number;
    };
    unit: '%' | 'hrs' | 'count';
}
declare const MetricDefinition: mongoose.Model<IMetricDefinition, {}, {}, {}, mongoose.Document<unknown, {}, IMetricDefinition, {}, {}> & IMetricDefinition & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default MetricDefinition;
//# sourceMappingURL=MetricDefinition.d.ts.map