import mongoose, { Document, Schema, Types } from 'mongoose';
import { PaymentMethod, PaymentStatus } from '@/types/enums.js';

export interface IPayment extends Document {
  rentalPeriodId: Types.ObjectId;
  reservationId: Types.ObjectId;
  studentId: Types.ObjectId;
  amount: number;
  paymentMethod: PaymentMethod;
  referenceNumber?: string;
  proofImageUrl?: string;
  status: PaymentStatus;
  paidAt: Date;
  rejectionReason?: string;
  confirmedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const paymentSchema = new Schema<IPayment>(
  {
    rentalPeriodId: {
      type: Schema.Types.ObjectId,
      ref: 'RentalPeriod',
      required: true,
    },
    reservationId: {
      type: Schema.Types.ObjectId,
      ref: 'Reservation',
      required: true,
    },
    studentId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    paymentMethod: {
      type: String,
      enum: Object.values(PaymentMethod),
      required: true,
    },
    referenceNumber: String,
    proofImageUrl: String,
    status: {
      type: String,
      enum: Object.values(PaymentStatus),
      default: PaymentStatus.PENDING,
    },
    paidAt: {
      type: Date,
      required: true,
    },
    rejectionReason: String,
    confirmedAt: Date,
  },
  {
    timestamps: true,
  },
);

paymentSchema.index({ rentalPeriodId: 1 });
paymentSchema.index({ reservationId: 1 });
paymentSchema.index({ studentId: 1 });
paymentSchema.index({ status: 1 });

export const Payment = mongoose.model<IPayment>('Payment', paymentSchema);
