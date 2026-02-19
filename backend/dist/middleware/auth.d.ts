import { Request, Response } from 'express';
declare const authMiddleware: (req: Request, res: Response, next: Function) => Promise<Response<any, Record<string, any>>>;
export default authMiddleware;
//# sourceMappingURL=auth.d.ts.map