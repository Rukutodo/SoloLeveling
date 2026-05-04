import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ICalendarEvent extends Document {
  userId: string;
  title: string;
  date: Date;
  endDate?: Date;
  type: 'workout' | 'meal' | 'finance' | 'general' | 'goal';
  color: string;
  notes?: string;
  completed: boolean;
  createdAt: Date;
}

const CalendarEventSchema = new Schema<ICalendarEvent>(
  {
    userId: { type: String, required: true, index: true },
    title: { type: String, required: true },
    date: { type: Date, required: true },
    endDate: { type: Date },
    type: {
      type: String,
      enum: ['workout', 'meal', 'finance', 'general', 'goal'],
      default: 'general',
    },
    color: { type: String, default: '#00d4ff' },
    notes: { type: String },
    completed: { type: Boolean, default: false },
  },
  { timestamps: true }
);

CalendarEventSchema.index({ userId: 1, date: 1 });

const CalendarEvent: Model<ICalendarEvent> =
  mongoose.models.CalendarEvent || mongoose.model<ICalendarEvent>('CalendarEvent', CalendarEventSchema);

export default CalendarEvent;
