import mongoose, { Document, Schema } from 'mongoose';
import { BoardingStatus, BoardingType, GenderPref } from '@/types/enums.js';

export interface IBoardingImage extends Document {
  boardingId: mongoose.Types.ObjectId;
  url: string;
  publicId: string;
  createdAt: Date;
}

const boardingImageSchema = new Schema<IBoardingImage>(
  {
    boardingId: {
      type: Schema.Types.ObjectId,
      ref: 'Boarding',
      required: true,
    },
    url: {
      type: String,
      required: true,
    },
    publicId: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

boardingImageSchema.index({ boardingId: 1 });

export const BoardingImage = mongoose.model<IBoardingImage>(
  'BoardingImage',
  boardingImageSchema,
);
