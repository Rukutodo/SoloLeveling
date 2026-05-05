import mongoose, { Schema, Document } from 'mongoose';

export interface IInsurance extends Document {
  userId: mongoose.Types.ObjectId;
  policyName: string;
  premiumAmount: number;
  frequency: 'Monthly' | 'Yearly';
  nextDueDate: Date;
  provider: string;
  category: string;
  active: boolean;
}

const InsuranceSchema: Schema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  policyName: { type: String, required: true },
  premiumAmount: { type: Number, required: true },
  frequency: { type: String, enum: ['Monthly', 'Yearly'], default: 'Monthly' },
  nextDueDate: { type: Date, required: true },
  provider: { type: String, default: '' },
  category: { type: String, default: 'Medical Insurance' },
  active: { type: Boolean, default: true },
}, { timestamps: true });

export default mongoose.models.Insurance || mongoose.model<IInsurance>('Insurance', InsuranceSchema);
