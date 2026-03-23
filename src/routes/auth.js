import "../loadEnv.js";
import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { validateCredentials } from "../utils/authValidation.js";
import { badRequest } from "../utils/http.js";

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "SECRET_KEY";

router.post("/register", async (req, res) => {
  const { email, password, errors } = validateCredentials(req.body || {});

  if (errors.length) {
    throw badRequest(errors.join(" "));
  }

  const existing = await User.findOne({ email });
  if (existing) {
    throw badRequest("Email déjà utilis?");
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await User.create({
    email,
    password: hashedPassword,
  });

  res.status(201).json({ message: "Utilisateur cr??", userId: user._id });
});

router.post("/login", async (req, res) => {
  const { email, password, errors } = validateCredentials(req.body || {});

  if (errors.length) {
    throw badRequest(errors.join(" "));
  }

  const user = await User.findOne({ email });
  if (!user) {
    throw badRequest("Utilisateur introuvable");
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    throw badRequest("Mot de passe incorrect");
  }

  const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: "7d" });

  res.json({
    token,
    userId: user._id,
    user: { id: user._id, email: user.email },
  });
});

export default router;
