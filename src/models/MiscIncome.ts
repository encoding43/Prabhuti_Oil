import { ObjectId } from 'mongodb';

export interface MiscIncome {
  _id?: ObjectId
  title: string
  date: Date
  amount: number
  paymentMethod: string
  note?: string
  createdAt: Date
}
