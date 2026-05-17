import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IApiLog extends Document {
  timestamp: Date;
  route: string;
  method: string;
  userId: string | null;
  userEmail: string | null;
  statusCode: number;
  durationMs: number;
  type: 'api' | 'ai' | 'auth' | 'finance' | 'health';
  error: string | null;
  userAgent: string | null;
  meta: Record<string, any>;
}

const ApiLogSchema = new Schema<IApiLog>(
  {
    timestamp:  { type: Date, default: Date.now, index: true },
    route:      { type: String, required: true, index: true },
    method:     { type: String, required: true },
    userId:     { type: String, default: null, index: true },
    userEmail:  { type: String, default: null },
    statusCode: { type: Number, required: true },
    durationMs: { type: Number, required: true },
    type:       { type: String, enum: ['api', 'ai', 'auth', 'finance', 'health'], default: 'api' },
    error:      { type: String, default: null },
    userAgent:  { type: String, default: null },
    meta:       { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: false }
);

// TTL index: auto-delete logs older than 30 days to prevent DB bloat
ApiLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 30 });
ApiLogSchema.index({ userId: 1, type: 1, timestamp: -1 });
ApiLogSchema.index({ route: 1, timestamp: -1 });

const ApiLog: Model<IApiLog> =
  mongoose.models.ApiLog || mongoose.model<IApiLog>('ApiLog', ApiLogSchema);

export default ApiLog;
