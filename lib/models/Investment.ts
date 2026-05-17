import mongoose, { Schema, Document } from 'mongoose';

export interface IInvestment extends Document {
  userId: mongoose.Types.ObjectId;
  fundName: string;
  investedAmount: number;
  currentAmount: number;
  expectedReturnRate: number;
  startDate: Date;
  type: string;
  subType?: string;
  schemeCode?: string; // For mfapi.in (Mutual Funds / Index Funds)
  ticker?: string;     // For Alpha Vantage (Stocks / ETFs)
  units?: number;
  lastUpdated?: Date;
}

const InvestmentSchema: Schema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  fundName: { type: String, required: true },
  investedAmount: { type: Number, required: true },
  currentAmount: { type: Number, required: true },
  expectedReturnRate: { type: Number, default: 12 },
  startDate: { type: Date, default: Date.now },
  type: { type: String, default: 'Mutual Fund' },
  subType: { type: String },
  schemeCode: { type: String },
  ticker: { type: String },
  units: { type: Number },
  lastUpdated: { type: Date },
}, { timestamps: true });

export default mongoose.models.Investment || mongoose.model<IInvestment>('Investment', InvestmentSchema);
