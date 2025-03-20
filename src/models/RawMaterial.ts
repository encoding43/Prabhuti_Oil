import mongoose from 'mongoose';
import { ObjectId } from 'mongodb';

const rawMaterialSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  currentStock: {
    type: Number,
    required: true,
    default: 0
  }
}, {
  timestamps: true
});

export interface RawMaterial {
  _id?: ObjectId
  name: string
  currentStock: number
  createdAt: Date
  updatedAt: Date
}

export interface RawMaterialTransaction {
  _id?: ObjectId
  materialId: ObjectId
  type: 'add' | 'subtract'
  quantity: number
  price: number
  date: Date
  note?: string
  createdAt: Date
}

export default mongoose.models.RawMaterial || mongoose.model('RawMaterial', rawMaterialSchema);
