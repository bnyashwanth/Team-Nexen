import mongoose, { Document } from 'mongoose';
interface IAlert extends Document {
    warehouseId: string;
    metricId: string;
    severity: 'warn' | 'critical';
    score: number;
    aiSummary: string;
    resolvedAt: Date | null;
}
declare const Alert: mongoose.Model<IAlert, {}, {}, {}, mongoose.Document<unknown, {}, IAlert, {}, {}> & IAlert & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default Alert;
//# sourceMappingURL=Alert.d.ts.map