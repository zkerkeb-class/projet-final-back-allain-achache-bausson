import express from "express";
import auth from "../middleware/auth.js";
import PublicPost from "../models/PublicPost.js";
import { badRequest, notFound } from "../utils/http.js";

const router = express.Router();

router.get("/", async (req, res) => {
  const posts = await PublicPost.find()
    .populate("user", "email")
    .populate("garment")
    .sort({ createdAt: -1 });
  res.json(posts);
});

router.post("/", auth, async (req, res) => {
  const { garmentId, description } = req.body || {};

  if (!garmentId || typeof garmentId !== "string" || !garmentId.trim()) {
    throw badRequest("L'ID du vêtement est requis.");
  }

  const post = await PublicPost.create({
    user: req.user.id,
    garment: garmentId.trim(),
    description: String(description || "").trim(),
  });

  const populated = await PublicPost.findById(post._id).populate("user", "email").populate("garment");
  res.status(201).json(populated);
});

router.delete("/:id", auth, async (req, res) => {
  const post = await PublicPost.findById(req.params.id);
  if (!post) {
    throw notFound("Post non trouve");
  }

  if (String(post.user) !== String(req.user.id)) {
    throw badRequest("Vous n'etes pas autorise a supprimer ce post.");
  }

  await post.deleteOne();
  res.status(204).send();
});

export default router;
