import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IUser extends Document {
  email: string;
  password: string;
  name: string;
  level: number;
  xp: number;
  totalXp: number;
  title: string;
  rank: string;
  height?: number;
  targetWeight?: number;
  dailyCalorieGoal: number;
  tag: string; // Unique Hunter Tag (e.g. Sung#1234)
  googleRefreshToken?: string;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: 6,
    },
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    level: { type: Number, default: 1 },
    xp: { type: Number, default: 0 },
    totalXp: { type: Number, default: 0 },
    title: { type: String, default: 'Awakened Hunter' },
    rank: { type: String, default: 'E' },
    height: { type: Number },
    targetWeight: { type: Number },
    dailyCalorieGoal: { type: Number, default: 2000 },
    tag: { type: String, unique: true, index: true },
    googleRefreshToken: { type: String },
  },
  {
    timestamps: true,
  }
);

const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);

export default User;
