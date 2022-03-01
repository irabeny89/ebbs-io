import { model, models, Schema, Model } from "mongoose";
import type { ProductType } from "types";
import config from "../../config";

const schema = new Schema<ProductType>(
  {
    name: {
      type: String,
      required: [true, "Product name is required"],
      unique: true,
    },
    description: {
      type: String,
      required: [true, "Product description is required"],
      maxlength: 255,
    },
    imagesCID: {
      type: String,
      required: [true, "Product image is required; atleast 1"],
    },
    videoCID: String,
    category: {
      type: String,
      required: [true, "Product category is required"],
      enum: config.appData.productCategories,
    },
    tags: [{ type: String, maxlength: 30 }],
    price: { type: Number, min: 0, required: [true, "Price is required"] },
    provider: { type: Schema.Types.ObjectId, ref: "Service" },
  },
  { timestamps: true }
);

export default (models.Product as Model<ProductType, {}, {}>) ||
  model<ProductType>("Product", schema);
