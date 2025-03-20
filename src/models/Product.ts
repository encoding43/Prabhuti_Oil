import mongoose from 'mongoose'
import { ObjectId } from 'mongodb';

export interface ProductQuantity {
  qty: number
  displayName: string
  price: number
  packingMaterialId: ObjectId
}

export interface Product {
  _id?: ObjectId
  type: 'oil' | 'other'
  name: string
  rawMaterialId: ObjectId
  recoveryRate: number
  quantities: ProductQuantity[]
  createdAt: Date
  updatedAt: Date
}

const productSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['oil', 'other'],
      required: true
    },
    name: {
      type: String,
      required: true
    },
    rawMaterialId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RawMaterial',
      required: true
    },
    recoveryRate: {
      type: Number,
      required: true
    },
    quantities: [
      {
        qty: Number,
        displayName: String,
        price: Number,
        packingMaterialId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'PackingMaterial'
        }
      }
    ]
  },
  {
    timestamps: true
  }
)

export default mongoose.models.Product || mongoose.model('Product', productSchema)
