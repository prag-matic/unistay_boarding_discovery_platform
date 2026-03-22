import mongoose, { Document, Schema } from 'mongoose';

export interface IBoardingRule extends Document {
  boardingId: mongoose.Types.ObjectId;
  rule: string;
}

const boardingRuleSchema = new Schema<IBoardingRule>({
  boardingId: {
    type: Schema.Types.ObjectId,
    ref: 'Boarding',
    required: true,
  },
  rule: {
    type: String,
    required: true,
  },
});

boardingRuleSchema.index({ boardingId: 1 });

export const BoardingRule = mongoose.model<IBoardingRule>(
  'BoardingRule',
  boardingRuleSchema,
);
