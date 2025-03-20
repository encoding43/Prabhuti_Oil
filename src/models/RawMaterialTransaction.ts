import mongoose from 'mongoose';

const rawMaterialTransactionSchema = new mongoose.Schema({
  materialId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RawMaterial',
    required: true
  },
  type: {
    type: String,
    enum: ['add', 'subtract'],
    default: 'add',
    required: true
  },
  quantity: {
    type: Number,
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  note: String,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.models.RawMaterialTransaction || 
  mongoose.model('RawMaterialTransaction', rawMaterialTransactionSchema);
