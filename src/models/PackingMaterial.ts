import mongoose from 'mongoose';
import { ObjectId } from 'mongodb';

export interface PackingMaterial {
  _id?: ObjectId
  name: string
  type: string
  currentStock: number
  capacity: number
  createdAt: Date
  updatedAt: Date
}

export interface PackingMaterialTransaction {
  _id?: ObjectId
  materialId: ObjectId
  type: 'add' | 'subtract'
  quantity: number
  price: number
  date: Date
  note?: string
  createdAt: Date
}

const packingMaterialSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  type: {
    type: String,
    required: true
  },
  currentStock: {
    type: Number,
    required: true,
    default: 0
  },
  capacity: {
    type: Number,
    required: true
  }
}, {
  timestamps: true
});

export default mongoose.models.PackingMaterial || mongoose.model('PackingMaterial', packingMaterialSchema);
