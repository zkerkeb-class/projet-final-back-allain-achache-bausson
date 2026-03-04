import mongoose from "mongoose";

const OutfitItemSchema = new mongoose.Schema(
  {
    category: { type: String, required: true },
    garment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Garment",
      required: true,
    },
    x: { type: Number, required: true },
    y: { type: Number, required: true },
    size: { type: Number, required: true },
    zIndex: { type: Number, default: 1 },
    rotation: { type: Number, default: 0 },
  },
  { _id: false }
);

const OutfitSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    items: { type: [OutfitItemSchema], default: [] },
    status: {
      type: String,
      enum: ["active", "retest", "archived"],
      default: "active",
    },
    isFavorite: { type: Boolean, default: false },
    wearCount: { type: Number, default: 0 },
    lastWornAt: { type: Date, default: null },
    personalNote: { type: String, default: "", trim: true, maxlength: 500 },
    personalRating: { type: Number, default: null, min: 1, max: 5 },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Outfit", OutfitSchema);
