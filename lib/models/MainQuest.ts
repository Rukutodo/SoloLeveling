import mongoose, { Schema, Document } from 'mongoose';

export interface IMilestone {
  title: string;
  description: string;
  targetType: 'weight' | 'income' | 'other';
  targetValue: number;
  deadline: Date;
  completed: boolean;
}

export interface IMainQuest extends Document {
  userId: mongoose.Types.ObjectId;
  title: string;
  targetWeight?: number;
  targetSalary?: number;
  deadline: Date;
  status: 'active' | 'completed' | 'failed';
  milestones: IMilestone[];
}

const MilestoneSchema = new Schema({
  title: { type: String, required: true },
  description: { type: String },
  targetType: { type: String, enum: ['weight', 'income', 'other'], required: true },
  targetValue: { type: Number, required: true },
  deadline: { type: Date, required: true },
  completed: { type: Boolean, default: false },
});

const MainQuestSchema: Schema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true, default: 'Road to S-Rank' },
  targetWeight: { type: Number },
  targetSalary: { type: Number },
  deadline: { type: Date, required: true },
  status: { type: String, enum: ['active', 'completed', 'failed'], default: 'active' },
  milestones: [MilestoneSchema],
}, { timestamps: true });

export default mongoose.models.MainQuest || mongoose.model<IMainQuest>('MainQuest', MainQuestSchema);
