import { ObjectId } from 'mongodb';

export interface Expense {
  _id?: ObjectId
  name: string
  date: Date
  amount: number
  note?: string
  createdAt: Date
}
