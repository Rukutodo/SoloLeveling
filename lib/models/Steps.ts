import mongoose, { Schema, Document } from 'mongoose';

export interface ISteps extends Document {
  userId: mongoose.Types.ObjectId;
  date: Date;
  steps: number;
  caloriesBurned: number;
}

const StepsSchema: Schema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: Date, required: true },
  steps: { type: Number, required: true, default: 0 },
  caloriesBurned: { type: Number, default: 0 },
}, { timestamps: true });

StepsSchema.index({ userId: 1, date: 1 }, { unique: true });

export default mongoose.models.Steps || mongoose.model<ISteps>('Steps', StepsSchema);
