import express from "express";
import auth from "../middleware/auth.js";
import CalendarPlan from "../models/CalendarPlan.js";
import Outfit from "../models/Outfit.js";
import Garment from "../models/Garment.js";
import { ensureValidObjectId } from "../middleware/validateObjectId.js";
import { badRequest, notFound } from "../utils/http.js";

const router = express.Router();

const getLocalIsoDate = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const toCalendarDate = (date) => {
  const parsed = new Date(`${date}T12:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const markOutfitAsWorn = async (outfit, userId, wornAt) => {
  const garmentIds = [
    ...new Set(
      (Array.isArray(outfit.items) ? outfit.items : [])
        .map((item) => {
          const garmentId = item?.garment?._id || item?.garment;
          return String(garmentId || "").trim();
        })
        .filter(Boolean)
    ),
  ];

  if (!garmentIds.length) {
    throw badRequest("This outfit has no garments");
  }

  const result = await Garment.updateMany(
    { _id: { $in: garmentIds }, user: userId },
    {
      $set: {
        lastWornAt: wornAt,
        laundryStatus: "dirty",
      },
      $inc: { wearCount: 1, wearCountSinceWash: 1 },
    }
  );

  outfit.lastWornAt = wornAt;
  outfit.wearCount = Math.max(0, Number(outfit.wearCount || 0) + 1);
  await outfit.save();

  return result.modifiedCount;
};

router.get("/", auth, async (req, res) => {
  const year = String(req.query.year || "").trim();

  if (!/^\d{4}$/.test(year)) {
    throw badRequest("A valid year is required");
  }

  const plans = await CalendarPlan.find({
    user: req.user.id,
    date: { $regex: `^${year}-` },
  })
    .populate({
      path: "outfit",
      populate: { path: "items.garment" },
    })
    .sort({ date: 1 });

  res.json(plans);
});

router.put("/:date", auth, async (req, res) => {
  const date = String(req.params.date || "").trim();
  const outfitId = String(req.body?.outfitId || "").trim();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw badRequest("Invalid date format");
  }

  if (!outfitId) {
    throw badRequest("Outfit id is required");
  }

  ensureValidObjectId(outfitId, "Outfit");

  const outfit = await Outfit.findOne({
    _id: outfitId,
    user: req.user.id,
  });

  if (!outfit) {
    throw notFound("Outfit not found");
  }

  const existingPlan = await CalendarPlan.findOne({ user: req.user.id, date });

  if (
    existingPlan?.wearLoggedAt &&
    String(existingPlan.outfit || "") !== outfitId
  ) {
    throw badRequest("This planned wear has already been counted");
  }

  const update = { outfit: outfitId };
  if (!existingPlan) {
    update.wornAt = null;
    update.wearLoggedAt = null;
  }

  const plan = await CalendarPlan.findOneAndUpdate(
    { user: req.user.id, date },
    { $set: update },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  ).populate({
    path: "outfit",
    populate: { path: "items.garment" },
  });

  res.json(plan);
});

router.post("/:date/mark-worn", auth, async (req, res) => {
  const date = String(req.params.date || "").trim();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw badRequest("Invalid date format");
  }

  if (date > getLocalIsoDate()) {
    throw badRequest("Cannot count a future planned wear");
  }

  const plan = await CalendarPlan.findOne({
    user: req.user.id,
    date,
  }).populate({
    path: "outfit",
    populate: { path: "items.garment" },
  });

  if (!plan || !plan.outfit) {
    throw notFound("Planned outfit not found");
  }

  if (plan.wearLoggedAt) {
    res.json({
      ok: true,
      alreadyCounted: true,
      date,
      outfitId: plan.outfit._id,
      wornAt: plan.wornAt,
      wearLoggedAt: plan.wearLoggedAt,
      updatedGarments: 0,
      wearCount: Number(plan.outfit.wearCount || 0),
    });
    return;
  }

  const wornAt = toCalendarDate(date);

  if (!wornAt) {
    throw badRequest("Invalid calendar date");
  }

  const updatedGarments = await markOutfitAsWorn(plan.outfit, req.user.id, wornAt);

  plan.wornAt = wornAt;
  plan.wearLoggedAt = new Date();
  await plan.save();

  res.json({
    ok: true,
    alreadyCounted: false,
    date,
    outfitId: plan.outfit._id,
    wornAt,
    wearLoggedAt: plan.wearLoggedAt,
    updatedGarments,
    wearCount: Number(plan.outfit.wearCount || 0),
  });
});

router.delete("/:date", auth, async (req, res) => {
  const date = String(req.params.date || "").trim();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw badRequest("Invalid date format");
  }

  const existingPlan = await CalendarPlan.findOne({ user: req.user.id, date });

  if (existingPlan?.wearLoggedAt) {
    throw badRequest("This planned wear has already been counted");
  }

  await CalendarPlan.findOneAndDelete({ user: req.user.id, date });
  res.json({ ok: true, date });
});

export default router;
