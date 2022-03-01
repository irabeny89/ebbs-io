import config from "../../config";
import { model, Schema, Model, models } from "mongoose";
import type { ServiceType } from "types";

const schema = new Schema<ServiceType>(
  {
    title: String,
    logoCID: String,
    description: {
      type: String,
      maxlength: 255,
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
