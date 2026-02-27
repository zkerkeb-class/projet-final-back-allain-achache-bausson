import mongoose from "mongoose";

const GarmentSchema = new mongoose.Schema(
  {
    title: String,
    category: String,
    color: String,
    imageUrl: { type: String, required: true },
    originalUrl: String,
    cutoutUrl: String,
    cloudinaryId: String,

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Garment", GarmentSchema);