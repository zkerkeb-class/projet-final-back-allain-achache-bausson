import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import axios from "axios";
import FormData from "form-data";
import Garment from "../models/Garment.js"; // <-- attention au .js en ES Modules
import { fileURLToPath } from "url";
import auth from "../middleware/auth.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

const uploadDir = path.join(__dirname, "..", "..", "uploads");
const cutoutDir = path.join(uploadDir, "cutouts");

const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

ensureDir(uploadDir);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || "");
    const safeExt = ext || ".png";
    const name = `${Date.now()}-${Math.round(Math.random() * 1e9)}${safeExt}`;
    cb(null, name);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

const buildCutout = async (filePath, fileName) => {
  const aiUrl = "http://localhost:5001"; // hardcodé comme tu voulais
  const enabled = true; // on force le cutout activé
  if (!enabled) return "";

  try {
    ensureDir(cutoutDir);
    const form = new FormData();
    form.append("image", fs.createReadStream(filePath));

    const response = await axios.post(`${aiUrl}/remove-bg`, form, {
      headers: form.getHeaders(),
      responseType: "arraybuffer",
      timeout: 30000,
    });

    const base = path.parse(fileName).name;
    const cutoutName = `${base}-cutout.png`;
    const cutoutPath = path.join(cutoutDir, cutoutName);
    fs.writeFileSync(cutoutPath, response.data);

    return `/uploads/cutouts/${cutoutName}`;
  } catch (err) {
    console.warn("Cutout failed:", err?.response?.data || err?.message || err);
    return "";
  }
};

// Routes
router.get("/", async (req, res) => {
  const garments = await Garment.find({ user: req.user.id });
  res.json(garments);
});

router.post("/upload", auth, upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Image file is required" });
    }

    const originalUrl = `/uploads/${req.file.filename}`;
    const cutoutUrl = await buildCutout(req.file.path, req.file.filename);
    const imageUrl = cutoutUrl || originalUrl;

    const garment = await Garment.create({
      title: req.body.title,
      category: req.body.category,
      color: req.body.color,
      imageUrl,
      originalUrl,
      cutoutUrl,
      cloudinaryId: "",
      user: req.user.id,
    });

    res.status(201).json(garment);
  } catch (err) {
    res.status(500).json({
      error: "Upload failed",
      details: err?.message || "Upload failed",
    });
  }
});

export default router;