import config from "../../config";
import { model, Schema, Model, models } from "mongoose";
import type { ServiceType } from "types";

const schema = new Schema<ServiceType>(
  {
    title: { type: String, trim: true },
    logoCID: { type: String, trim: true },
    description: {
      type: String,
      maxlength: 255,
      trim: true,
    },
    state: String,
    maxProduct: {
      type: Number,
      default: config.appData.maxProductAllowed,
      min: 0,
    },
    owner: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export default (models.Service as Model<ServiceType, {}, {}>) ||
  model<ServiceType>("Service", schema);
