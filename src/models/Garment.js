import mongoose from "mongoose";

const GarmentSchema = new mongoose.Schema(
  {
    title: String,
    category: String,
    color: String,
    secondaryColor: String,
    brand: String,
    price: { type: Number, default: null },
    purchaseDate: { type: Date, default: null },
    purchaseLocation: String,
    origin: String,
    size: String,
    material: String,
    occasions: { type: [String], default: [] },
    seasons: { type: [String], default: [] },
    weatherTags: { type: [String], default: [] },
    contexts: { type: [String], default: [] },
    condition: { type: String, enum: ["perfect", "good", "bad"], default: "good" },
    notes: String,
    laundryStatus: { type: String, enum: ["clean", "dirty"], default: "clean" },
    lastWashedAt: { type: Date, default: null },
    wearCountSinceWash: { type: Number, default: 0 },
    lastWornAt: { type: Date, default: null },
    wearCount: { type: Number, default: 0 },
    isArchived: { type: Boolean, default: false },
    archivedAt: { type: Date, default: null },
    imageUrl: { type: String, required: true },
    originalUrl: String,
    cutoutUrl: String,
    uploadMeta: { type: mongoose.Schema.Types.Mixed, default: null },
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
