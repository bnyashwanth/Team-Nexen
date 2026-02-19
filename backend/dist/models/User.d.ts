import mongoose, { Document } from 'mongoose';
interface IUser extends Document {
    email: string;
    passwordHash: string;
    role: 'manager' | 'analyst';
    name: string;
    lastLogin?: Date;
    comparePassword(candidatePassword: string): Promise<boolean>;
    toProfile(): object;
}
declare const User: mongoose.Model<IUser, {}, {}, {}, mongoose.Document<unknown, {}, IUser, {}, {}> & IUser & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default User;
//# sourceMappingURL=User.d.ts.map