import express from "express";
import auth from "../middleware/auth.js";
import validateObjectId from "../middleware/validateObjectId.js";
import Outfit from "../models/Outfit.js";
import Garment from "../models/Garment.js";
import {
  validateOutfitMetaPayload,
  validateOutfitPayload,
} from "../utils/outfitValidation.js";
import { badRequest, notFound } from "../utils/http.js";

const router = express.Router();

const findOwnedOutfit = (id, userId) =>
  Outfit.findOne({
    _id: id,
    user: userId,
  });

router.get("/", auth, async (req, res) => {
  const outfits = await Outfit.find({ user: req.user.id })
    .populate("items.garment")
    .sort({ createdAt: -1 });

  res.json(outfits);
});

router.get("/public", async (req, res) => {
  const outfits = await Outfit.find({ isPublic: true })
    .populate("items.garment")
    .populate("user", "email") // Pour afficher le nom de l'utilisateur
    .sort({ createdAt: -1 });

  res.json(outfits);
});

router.post("/", auth, async (req, res) => {
  const { name, items, status, isFavorite, personalNote, personalRating, errors } = validateOutfitPayload(
    req.body || {}
  );
  if (errors.length) {
    throw badRequest(errors.join(" "));
  }

  const outfit = await Outfit.create({
    name,
    items,
    status,
    isFavorite,
    personalNote,
    personalRating,
    user: req.user.id,
  });

  const populated = await Outfit.findById(outfit._id).populate("items.garment");
  res.status(201).json(populated);
});

router.put("/:id", auth, validateObjectId("id", "Outfit"), async (req, res) => {
  const outfit = await findOwnedOutfit(req.params.id, req.user.id);

  if (!outfit) {
    throw notFound("Outfit not found");
  }

  const { name, items, status, isFavorite, personalNote, personalRating, errors } = validateOutfitPayload(
    req.body || {}
  );
  if (errors.length) {
    throw badRequest(errors.join(" "));
  }

  outfit.name = name;
  outfit.items = items;
  outfit.status = status;
  outfit.isFavorite = isFavorite;
  outfit.personalNote = personalNote;
  outfit.personalRating = personalRating;

  await outfit.save();

  const populated = await Outfit.findById(outfit._id).populate("items.garment");
  res.json(populated);
});

router.patch("/:id", auth, validateObjectId("id", "Outfit"), async (req, res) => {
  const outfit = await findOwnedOutfit(req.params.id, req.user.id);

  if (!outfit) {
    throw notFound("Outfit not found");
  }

  const { updates, errors } = validateOutfitMetaPayload(req.body || {});
  if (errors.length) {
    throw badRequest(errors.join(" "));
  }

  Object.assign(outfit, updates);
  await outfit.save();

  const populated = await Outfit.findById(outfit._id).populate("items.garment");
  res.json(populated);
});

router.post("/:id/wear", auth, validateObjectId("id", "Outfit"), async (req, res) => {
  const outfit = await findOwnedOutfit(req.params.id, req.user.id);

  if (!outfit) {
    throw notFound("Outfit not found");
  }

  const wornAt = req.body?.wornAt ? new Date(req.body.wornAt) : new Date();

  if (Number.isNaN(wornAt.getTime())) {
    throw badRequest("Invalid wornAt date");
  }

  const garmentIds = [
    ...new Set(
      (Array.isArray(outfit.items) ? outfit.items : [])
        .map((item) => String(item?.garment || "").trim())
        .filter(Boolean)
    ),
  ];

  if (!garmentIds.length) {
    throw badRequest("This outfit has no garments");
  }

  const result = await Garment.updateMany(
    { _id: { $in: garmentIds }, user: req.user.id },
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

  res.json({
    ok: true,
    outfitId: outfit._id,
    wornAt,
    wearCount: outfit.wearCount,
    updatedGarments: result.modifiedCount,
  });
});

router.delete("/:id", auth, validateObjectId("id", "Outfit"), async (req, res) => {
  const deleted = await Outfit.findOneAndDelete({
    _id: req.params.id,
    user: req.user.id,
  });

  if (!deleted) {
    throw notFound("Outfit not found");
  }

  res.json({ ok: true, id: deleted._id });
});

export default router;
