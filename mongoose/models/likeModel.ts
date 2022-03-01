import { models, Schema, model, Model } from "mongoose";
import type { LikeType } from "types";

const schema = new Schema<LikeType>(
  {
    selection: { type: Schema.Types.ObjectId, ref: "Service" },
    happyClients: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
  },
  { timestamps: true }
);

export default (models.Like as Model<LikeType, {}, {}>) ||
  model<LikeType>("Like", schema);
