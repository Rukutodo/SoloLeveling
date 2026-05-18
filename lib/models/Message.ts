import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IMessage extends Document {
  senderId: string; // 'system' or userId
  receiverId: string; // userId
  text: string;
  type: 'system' | 'chat';
  isRead: boolean;
  createdAt: Date;
}

const MessageSchema = new Schema<IMessage>(
  {
    senderId: { type: String, required: true },
    receiverId: { type: String, required: true, index: true },
    text: { type: String, required: true },
    type: { type: String, enum: ['system', 'chat'], default: 'chat' },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const Message: Model<IMessage> =
  mongoose.models.Message || mongoose.model<IMessage>('Message', MessageSchema);

export default Message;
