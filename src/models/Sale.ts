import mongoose from 'mongoose';
import { ObjectId } from 'mongodb';

export interface SaleProduct {
  productId: ObjectId
  type: 'oil' | 'other'
  name: string
  qty: number
  nos: number
  isPackagingMaterialUsed: boolean
  price: number
  discount: number
  finalPrice: number
}

export interface Payment {
  _id?: ObjectId
  method: 'online' | 'cash'
  amount: number
  date: Date
}

export interface Sale {
  _id?: ObjectId
  date: Date
  customerName: string
  customerMobile: string
  customerAddress: string
  saleType: 'direct' | 'courier'
  courierPrice: number
  products: SaleProduct[]
  totalAmount: number
  payments: Payment[]
  remainingAmount: number
  status: 'completed' | 'pending'
  createdAt: Date
  updatedAt: Date
}

const saleSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true
  },
  customerName: {
    type: String,
    required: true
  },
  customerMobile: String,
  customerAddress: String,
  saleType: {
    type: String,
    enum: ['direct', 'courier'],
    required: true
  },
  courierPrice: Number,
  products: [{
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    type: {
      type: String,
      enum: ['oil', 'other'],
      required: true
    },
    name: String,
    qty: Number,
    nos: Number,
    isPackagingMaterialUsed: Boolean,
    price: Number,
    discount: Number,
    finalPrice: Number
  }],
  totalAmount: {
    type: Number,
    required: true
  },
  payments: [{
    method: {
      type: String,
      enum: ['online', 'cash'],
      required: true
    },
    amount: Number,
    date: Date
  }],
  remainingAmount: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['completed', 'pending'],
    default: 'pending'
  }
}, {
  timestamps: true
});

export default mongoose.models.Sale || mongoose.model('Sale', saleSchema);
