import mongoose from "mongoose";

const CalendarPlanSchema = new mongoose.Schema(
  {
    date: { type: String, required: true, trim: true },
    wornAt: { type: Date, default: null },
    wearLoggedAt: { type: Date, default: null },
    outfit: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Outfit",
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

CalendarPlanSchema.index({ user: 1, date: 1 }, { unique: true });

export default mongoose.model("CalendarPlan", CalendarPlanSchema);
