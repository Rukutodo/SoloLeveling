import mongoose, { Schema, Document } from 'mongoose';

export interface IDailyLog extends Document {
  userId: mongoose.Types.ObjectId;
  dateStr: string; // YYYY-MM-DD
  drawingData: string; // Base64 data URL
}

const DailyLogSchema: Schema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  dateStr: { type: String, required: true },
  drawingData: { type: String, required: true },
}, { timestamps: true });

// Ensure unique entry per user per day
DailyLogSchema.index({ userId: 1, dateStr: 1 }, { unique: true });

export default mongoose.models.DailyLog || mongoose.model<IDailyLog>('DailyLog', DailyLogSchema);
