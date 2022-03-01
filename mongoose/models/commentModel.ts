import { model, Schema, Model, models } from "mongoose";
import type { CommentType } from "types";

const schema = new Schema<CommentType>(
  {
    poster: { type: Schema.Types.ObjectId, ref: "User" },
    post: { type: String, maxlength: 255 },
    topic: { type: Schema.Types.ObjectId, ref: "Service" },
  },
  { timestamps: true }
);

export default (models.Comment as Model<CommentType, {}, {}>) ||
  model<CommentType>("Comment", schema);
