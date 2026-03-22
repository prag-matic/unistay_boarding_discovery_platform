import mongoose, { Document, Schema, Types } from 'mongoose';
import { VisitRequestStatus } from '@/types/enums.js';

export interface IVisitRequest extends Document {
  studentId: Types.ObjectId;
  boardingId: Types.ObjectId;
  status: VisitRequestStatus;
  requestedStartAt: Date;
  requestedEndAt: Date;
  message?: string;
  rejectionReason?: string;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const visitRequestSchema = new Schema<IVisitRequest>(
  {
    studentId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    boardingId: {
      type: Schema.Types.ObjectId,
      ref: 'Boarding',
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(VisitRequestStatus),
      default: VisitRequestStatus.PENDING,
    },
    requestedStartAt: {
      type: Date,
      required: true,
    },
    requestedEndAt: {
      type: Date,
      required: true,
    },
    message: String,
    rejectionReason: String,
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

visitRequestSchema.index({ studentId: 1 });
visitRequestSchema.index({ boardingId: 1 });
visitRequestSchema.index({ status: 1 });

export const VisitRequest = mongoose.model<IVisitRequest>(
  'VisitRequest',
  visitRequestSchema,
);
