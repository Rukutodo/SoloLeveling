import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IFriend extends Document {
  requester: mongoose.Types.ObjectId;
  recipient: mongoose.Types.ObjectId;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: Date;
  updatedAt: Date;
}

const FriendSchema = new Schema<IFriend>(
  {
    requester: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    recipient: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'declined'],
      default: 'pending',
    },
  },
  { timestamps: true }
);

// Prevent duplicate requests and ensure unique relationships
FriendSchema.index({ requester: 1, recipient: 1 }, { unique: true });

const Friend: Model<IFriend> =
  mongoose.models.Friend || mongoose.model<IFriend>('Friend', FriendSchema);

export default Friend;
