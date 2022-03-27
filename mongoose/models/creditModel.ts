import { models, Schema, model, Model } from "mongoose";
import type { CreditOrDebitType } from "types";

const schema = new Schema<CreditOrDebitType>(
  {
    from: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "From is required"],
    },
    to: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "To is required"],
    },
    amount: {
      type: Number,
      min: 0,
      required: [true, "Amount is required"],
    },
    aggregate: {
      type: Number,
      min: 0,
      required: [true, "Aggregate is required"],
    },
    type: {
      type: String,
      enum: ["purchase", "transfer"],
    },
  },
  { timestamps: true }
);

export default (models.Credit as Model<CreditOrDebitType, {}, {}>) ||
  model<CreditOrDebitType>("Credit", schema);
