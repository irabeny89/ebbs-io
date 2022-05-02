import { models, Schema, model, Model } from "mongoose";
import type { MessageType } from "types";

const schema = new Schema<MessageType>({
  message: {
    type: String,
    required: [true, "Message is required"],
  },
  sender: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: [true, "Sender is required"],
  },
  receiver: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: [true, "Receiver is required"],
  },
});

export default (models.Message as Model<MessageType, {}, {}>) ||
  model<MessageType>("Message", schema);
