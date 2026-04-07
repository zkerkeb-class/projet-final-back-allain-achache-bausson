import mongoose from "mongoose";

const PublicPostSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    garment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Garment",
      required: true,
    },
    description: {
      type: String,
      default: "",
      trim: true,
      maxlength: 500,
    },
  },
  { timestamps: true }
);

export default mongoose.model("PublicPost", PublicPostSchema);
