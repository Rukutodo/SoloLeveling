import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IBodyMetric extends Document {
  userId: string;
  date: Date;
  weight: number;
  height: number;
  bmi: number;
  category: string;
  createdAt: Date;
}

const BodyMetricSchema = new Schema<IBodyMetric>(
  {
    userId: { type: String, required: true, index: true },
    date: { type: Date, required: true },
    weight: { type: Number, required: true },
    height: { type: Number, required: true },
    bmi: { type: Number, required: true },
    category: { type: String, required: true },
  },
  { timestamps: true }
);

BodyMetricSchema.index({ userId: 1, date: -1 });

const BodyMetric: Model<IBodyMetric> =
  mongoose.models.BodyMetric || mongoose.model<IBodyMetric>('BodyMetric', BodyMetricSchema);

export default BodyMetric;
