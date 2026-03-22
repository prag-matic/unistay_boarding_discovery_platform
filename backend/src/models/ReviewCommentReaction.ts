import mongoose, { Document, Schema, Types } from 'mongoose';
import { ReactionType } from '@/types/enums.js';

export interface IReviewCommentReaction extends Document {
  reviewCommentId: Types.ObjectId;
  userId: Types.ObjectId;
  type: ReactionType;
  createdAt: Date;
}

const reviewCommentReactionSchema = new Schema<IReviewCommentReaction>(
  {
    reviewCommentId: {
      type: Schema.Types.ObjectId,
      ref: 'ReviewComment',
      required: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: Object.values(ReactionType),
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

reviewCommentReactionSchema.index({ reviewCommentId: 1 });
reviewCommentReactionSchema.index({ userId: 1 });
reviewCommentReactionSchema.index({ reviewCommentId: 1, userId: 1 }, { unique: true });

export const ReviewCommentReaction = mongoose.model<IReviewCommentReaction>(
  'ReviewCommentReaction',
  reviewCommentReactionSchema,
);
