import { Document, Types } from 'mongoose'

declare global {
  namespace Mongoose {
    interface Document<T = any> {
      _id: T
      __v: number
      get(key: string): any
      set(key: string, value: any, options?: any): any
      save(options?: any): Promise<Document<T>>
      toJSON(): any
      toObject(): any
    }
  }
}

export = Document
