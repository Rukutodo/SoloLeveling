import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IFoodEntry extends Document {
  userId: string;
  date: Date;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  foodName: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  source: 'ai' | 'manual';
  confidence?: number;
  createdAt: Date;
}

const FoodEntrySchema = new Schema<IFoodEntry>(
  {
    userId: { type: String, required: true, index: true },
    date: { type: Date, required: true, index: true },
    mealType: {
      type: String,
      enum: ['breakfast', 'lunch', 'dinner', 'snack'],
      required: true,
    },
    foodName: { type: String, required: true },
    calories: { type: Number, required: true },
    protein: { type: Number, default: 0 },
    carbs: { type: Number, default: 0 },
    fat: { type: Number, default: 0 },
    fiber: { type: Number, default: 0 },
    source: { type: String, enum: ['ai', 'manual'], default: 'manual' },
    confidence: { type: Number },
  },
  { timestamps: true }
);

FoodEntrySchema.index({ userId: 1, date: 1 });

const FoodEntry: Model<IFoodEntry> =
  mongoose.models.FoodEntry || mongoose.model<IFoodEntry>('FoodEntry', FoodEntrySchema);

export default FoodEntry;
