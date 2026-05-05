import mongoose, { Schema, Document } from 'mongoose';

export interface ISleep extends Document {
  userId: mongoose.Types.ObjectId;
  date: Date;
  hours: number;
  quality: number; // 1-5
  notes?: string;
}

const SleepSchema: Schema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: Date, required: true },
  hours: { type: Number, required: true },
  quality: { type: Number, min: 1, max: 5, default: 3 },
  notes: { type: String },
}, { timestamps: true });

SleepSchema.index({ userId: 1, date: 1 }, { unique: true });

export default mongoose.models.Sleep || mongoose.model<ISleep>('Sleep', SleepSchema);
