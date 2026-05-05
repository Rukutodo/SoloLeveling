import mongoose, { Schema, Document } from 'mongoose';

export interface IBirthday extends Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  date: Date;
  relationship: 'Friend' | 'Family' | 'Colleague' | 'Other';
  notes?: string;
}

const BirthdaySchema: Schema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  date: { type: Date, required: true },
  relationship: { type: String, enum: ['Friend', 'Family', 'Colleague', 'Other'], default: 'Friend' },
  notes: { type: String },
}, { timestamps: true });

export default mongoose.models.Birthday || mongoose.model<IBirthday>('Birthday', BirthdaySchema);
