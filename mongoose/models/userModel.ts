import { models, Schema, model, Model } from "mongoose";
import type { UserType } from "types";

const schema = new Schema<UserType>(
  {
    role: { type: String, default: "USER", enum: ["ADMIN", "USER"] },
    username: {
      type: String,
      required: [true, "Username is required"],
      unique: true,
      maxlength: 30,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      unique: true,
      match: /.+\@.+\..+/,
      required: [true, "Email is required"],
      lowercase: true,
    },
    password: { type: String, required: [true, "Password is required"] },
    salt: { type: String, required: [true, "Salt is required"] },
  },
  { timestamps: true }
);

export default (models.User as Model<UserType, {}, {}>) ||
  model<UserType>("User", schema);
