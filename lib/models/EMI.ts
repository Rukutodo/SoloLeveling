import mongoose, { Schema, Document } from 'mongoose';

export interface IEMI extends Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  amount: number;
  dayOfMonth: number;
  startDate: Date;
  totalMonths: number;
  remainingMonths: number;
  category: string;
  active: boolean;
}

const EMISchema: Schema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  amount: { type: Number, required: true },
  dayOfMonth: { type: Number, required: true, min: 1, max: 31 },
  startDate: { type: Date, default: Date.now },
  totalMonths: { type: Number, required: true },
  remainingMonths: { type: Number, required: true },
  category: { type: String, default: 'EMI' },
  active: { type: Boolean, default: true },
}, { timestamps: true });

export default mongoose.models.EMI || mongoose.model<IEMI>('EMI', EMISchema);
