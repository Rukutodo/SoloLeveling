import mongoose, { Schema, Document } from 'mongoose';

export interface ITodo extends Document {
  userId: mongoose.Types.ObjectId;
  title: string;
  completed: boolean;
  priority: 'Low' | 'Medium' | 'High';
  dueDate?: Date;
  status: 'Idea' | 'Todo' | 'In Progress' | 'Done';
  note?: string;
  category: 'Strategic' | 'Daily';
}

const TodoSchema: Schema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  completed: { type: Boolean, default: false },
  priority: { type: String, enum: ['Low', 'Medium', 'High'], default: 'Medium' },
  dueDate: { type: Date },
  status: { type: String, enum: ['Idea', 'Todo', 'In Progress', 'Done'], default: 'Todo' },
  note: { type: String },
  category: { type: String, enum: ['Strategic', 'Daily'], default: 'Daily' },
}, { timestamps: true });

export default mongoose.models.Todo || mongoose.model<ITodo>('Todo', TodoSchema);
