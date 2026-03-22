import mongoose, { Document, Schema } from 'mongoose';

export interface ISavedBoarding extends Document {
  boardingId: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;
  createdAt: Date;
}

const savedBoardingSchema = new Schema<ISavedBoarding>(
  {
    boardingId: {
      type: Schema.Types.ObjectId,
      ref: 'Boarding',
      required: true,
    },
    studentId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

savedBoardingSchema.index({ boardingId: 1, studentId: 1 }, { unique: true });

export const SavedBoarding = mongoose.model<ISavedBoarding>(
  'SavedBoarding',
  savedBoardingSchema,
);
