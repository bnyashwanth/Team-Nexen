import mongoose, { Document } from 'mongoose';
interface IAgentLog extends Document {
    userId: string;
    userMessage: string;
    agentResponse: string;
    contextNode: string;
    tokensUsed: number;
}
declare const AgentLog: mongoose.Model<IAgentLog, {}, {}, {}, mongoose.Document<unknown, {}, IAgentLog, {}, {}> & IAgentLog & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default AgentLog;
//# sourceMappingURL=AgentLog.d.ts.map