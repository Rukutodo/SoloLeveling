import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IExerciseLog {
  exerciseId: string;
  name: string;
  sets: number;
  reps: number;
  weight?: number;
}

export interface IWorkoutLog extends Document {
  userId: string;
  date: Date;
  mode: 'home' | 'gym';
  exercises: IExerciseLog[];
  duration: number;
  notes?: string;
  caloriesBurned?: number;
  createdAt: Date;
}

const ExerciseLogSchema = new Schema<IExerciseLog>({
  exerciseId: { type: String, required: true },
  name: { type: String, required: true },
  sets: { type: Number, required: true },
  reps: { type: Number, required: true },
  weight: { type: Number },
});

const WorkoutLogSchema = new Schema<IWorkoutLog>(
  {
    userId: { type: String, required: true, index: true },
    date: { type: Date, required: true },
    mode: { type: String, enum: ['home', 'gym'], required: true },
    exercises: [ExerciseLogSchema],
    duration: { type: Number, required: true },
    notes: { type: String },
    caloriesBurned: { type: Number },
  },
  { timestamps: true }
);

WorkoutLogSchema.index({ userId: 1, date: -1 });

const WorkoutLog: Model<IWorkoutLog> =
  mongoose.models.WorkoutLog || mongoose.model<IWorkoutLog>('WorkoutLog', WorkoutLogSchema);

export default WorkoutLog;
