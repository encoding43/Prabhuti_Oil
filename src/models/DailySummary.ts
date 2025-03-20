import { ObjectId } from 'mongodb';

export interface MaterialUsage {
  materialId: ObjectId
  materialName: string
  quantity: number
  price: number
}

export interface OilSale {
  productId: ObjectId
  productName: string
  quantity: number
  amount: number
}

export interface DailySummary {
  _id?: ObjectId
  date: Date
  totalSales: number
  totalExpenses: number
  totalMiscIncome: number
  pendingAmount: number
  onlineAmount: number
  cashAmount: number
  rawMaterialUsage: MaterialUsage[]
  packingMaterialUsage: MaterialUsage[]
  oilSales: OilSale[]
  createdAt: Date
}
