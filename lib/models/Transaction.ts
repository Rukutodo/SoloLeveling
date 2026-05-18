import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ITransaction extends Document {
  userId: string;
  date: Date;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  description: string;
  recurring: boolean;
  source?: string; // Origin of the transaction (e.g., filename)
  index?: number;  // Chronological order in statement
  signature?: string; // Unique signature for deduplication
  createdAt: Date;
}

const TransactionSchema = new Schema<ITransaction>(
  {
    userId: { type: String, required: true, index: true },
    date: { type: Date, required: true },
    amount: { type: Number, required: true },
    type: {
      type: String,
      enum: ['income', 'expense'],
      required: true,
    },
    category: { type: String, required: true },
    description: { type: String, required: true },
    recurring: { type: Boolean, default: false },
    source: { type: String },
    index: { type: Number },
    signature: { type: String, sparse: true, index: true },
  },
  { timestamps: true }
);

TransactionSchema.index({ userId: 1, date: -1 });
TransactionSchema.index({ userId: 1, type: 1 });
TransactionSchema.index({ userId: 1, signature: 1 }, { unique: true, sparse: true });

const Transaction: Model<ITransaction> =
  mongoose.models.Transaction || mongoose.model<ITransaction>('Transaction', TransactionSchema);

export default Transaction;

