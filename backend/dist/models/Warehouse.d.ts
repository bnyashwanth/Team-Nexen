import mongoose from 'mongoose';
interface IWarehouse {
    _id: string;
    name: string;
    zone: 'North' | 'South' | 'East' | 'West';
    city: string;
    isActive: boolean;
}
declare const Warehouse: mongoose.Model<IWarehouse, {}, {}, {}, mongoose.Document<unknown, {}, IWarehouse, {}, {}> & IWarehouse & Required<{
    _id: string;
}> & {
    __v: number;
}, any>;
export default Warehouse;
//# sourceMappingURL=Warehouse.d.ts.map