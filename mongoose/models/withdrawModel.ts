import { models, Schema, model, Model } from "mongoose";
import type { DepositOrWithdrawType } from "types";

const schema = new Schema<DepositOrWithdrawType>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "UserId is required"],
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
  },
  { timestamps: true }
);

export default (models.Withdraw as Model<DepositOrWithdrawType, {}, {}>) ||
  model<DepositOrWithdrawType>("Withdraw", schema);
