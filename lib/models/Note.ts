import mongoose, { Schema, Document } from 'mongoose';

export interface INote extends Document {
  userId: mongoose.Types.ObjectId;
  title: string;
  content: string;
  section: string;
  drawingData: string;
  pageStyle: string;
  pageColor: string;
}

const NoteSchema: Schema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, default: 'Untitled Page' },
  content: { type: String, default: '' },
  section: { type: String, default: 'General' },
  drawingData: { type: String, default: '' },
  pageStyle: { type: String, default: 'plain' },
  pageColor: { type: String, default: 'var(--sl-bg-surface)' },
}, { timestamps: true });

export default mongoose.models.Note || mongoose.model<INote>('Note', NoteSchema);
