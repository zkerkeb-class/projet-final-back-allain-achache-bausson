import "../loadEnv.js";
import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import axios from "axios";
import FormData from "form-data";
import Garment from "../models/Garment.js";
import { fileURLToPath } from "url";
import auth from "../middleware/auth.js";
import validateObjectId, { ensureValidObjectId } from "../middleware/validateObjectId.js";
import { buildGarmentPayload, validateGarmentPayload } from "../utils/garmentValidation.js";

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

const toBoolean = (value, fallback = true) => {
  if (value == null) return fallback;
  const normalized = String(value).trim().toLowerCase();
  return !["0", "false", "no", "off"].includes(normalized);
};

const parseUploadMeta = (value) => {
  if (value == null || value === "") {
    return { meta: null, error: "" };
  }

  if (typeof value === "object") {
    return { meta: value, error: "" };
  }

  try {
    const parsed = JSON.parse(String(value));
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return { meta: null, error: "Upload metadata must be an object" };
    }

    return { meta: parsed, error: "" };
  } catch {
    return { meta: null, error: "Upload metadata is invalid JSON" };
  }
};

const mergeUploadMeta = (currentMeta, extraMeta = {}) => {
  const baseMeta =
    currentMeta && typeof currentMeta === "object" && !Array.isArray(currentMeta)
      ? { ...currentMeta }
      : {};

  Object.entries(extraMeta).forEach(([key, value]) => {
    if (value == null || value === "") {
      delete baseMeta[key];
      return;
    }

    baseMeta[key] = value;
  });

  return Object.keys(baseMeta).length ? baseMeta : null;
};

const deleteLocalAsset = (assetUrl) => {
  if (!assetUrl || !assetUrl.startsWith("/uploads/")) return;

  const relativeAssetPath = assetUrl.replace("/uploads/", "");
  const absoluteAssetPath = path.join(uploadDir, relativeAssetPath);

  if (fs.existsSync(absoluteAssetPath)) {
    fs.unlinkSync(absoluteAssetPath);
  }
};

const toAbsoluteUploadPath = (assetUrl) => {
  if (!assetUrl || !assetUrl.startsWith("/uploads/")) return "";
  const relativeAssetPath = assetUrl.replace("/uploads/", "");
  return path.join(uploadDir, relativeAssetPath);
};

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:5001";
const CUTOUT_ENABLED = toBoolean(process.env.CUTOUT_ENABLED, true);

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
  limits: { fileSize: 10 * 1024 * 1024 },
});

const buildCutout = async (filePath, fileName) => {
  if (!CUTOUT_ENABLED) {
    return { url: "", error: "" };
  }

  try {
    ensureDir(cutoutDir);
    const form = new FormData();
    form.append("image", fs.createReadStream(filePath));

    const response = await axios.post(`${AI_SERVICE_URL}/remove-bg`, form, {
      headers: form.getHeaders(),
      responseType: "arraybuffer",
      timeout: 120000,
    });

    const base = path.parse(fileName).name;
    const cutoutName = `${base}-cutout.png`;
    const cutoutPath = path.join(cutoutDir, cutoutName);
    fs.writeFileSync(cutoutPath, response.data);

    return { url: `/uploads/cutouts/${cutoutName}`, error: "" };
  } catch (err) {
    const details =
      typeof err?.response?.data === "string"
        ? err.response.data
        : err?.response?.data?.error || err?.message || "Background removal failed";
    console.warn("Cutout failed:", details);
    return { url: "", error: details };
  }
};

const syncGarmentImageSource = (garment, preferredSource = "cutout") => {
  if (preferredSource === "original" && garment.originalUrl) {
    garment.imageUrl = garment.originalUrl;
    return;
  }

  garment.imageUrl = garment.cutoutUrl || garment.originalUrl || garment.imageUrl;
};

router.get("/", auth, async (req, res) => {
  const includeArchived = String(req.query?.includeArchived || "").trim().toLowerCase() === "true";
  const query = includeArchived ? { user: req.user.id } : { user: req.user.id, isArchived: { $ne: true } };
  const garments = await Garment.find(query).sort({ createdAt: -1 });
  res.json(garments);
});

router.post("/upload", auth, upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Image file is required" });
    }

    const { payload, errors } = validateGarmentPayload(req.body);
    if (errors.length) {
      return res.status(400).json({
        error: "Invalid garment payload",
        details: errors.join(" "),
      });
    }

    const { meta: uploadMeta, error: uploadMetaError } = parseUploadMeta(
      req.body?.uploadMeta
    );
    if (uploadMetaError) {
      return res.status(400).json({
        error: "Invalid upload metadata",
        details: uploadMetaError,
      });
    }

    const originalUrl = `/uploads/${req.file.filename}`;
    const { url: cutoutUrl, error: cutoutError } = await buildCutout(
      req.file.path,
      req.file.filename
    );

    const imageUrl = cutoutUrl || originalUrl;
    const garmentUploadMeta = mergeUploadMeta(uploadMeta, {
      cutoutStatus: cutoutUrl ? "ready" : CUTOUT_ENABLED ? "failed" : "disabled",
      cutoutError: cutoutUrl ? "" : cutoutError,
    });
    const garment = await Garment.create({
      ...payload,
      imageUrl,
      originalUrl,
      cutoutUrl,
      uploadMeta: garmentUploadMeta,
      cloudinaryId: "",
      user: req.user.id,
    });

    res.status(201).json(garment);
  } catch (err) {
    throw err;
  }
});

router.post("/:id/reprocess-cutout", auth, validateObjectId("id", "Garment"), async (req, res) => {
  try {
    const garment = await Garment.findOne({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!garment) {
      return res.status(404).json({ error: "Garment not found" });
    }

    const sourceUrl = garment.originalUrl || garment.imageUrl || garment.cutoutUrl;
    const sourcePath = toAbsoluteUploadPath(sourceUrl);

    if (!sourcePath || !fs.existsSync(sourcePath)) {
      return res.status(400).json({
        error: "Original image unavailable",
        details: "Impossible de relancer le detourage sans image source locale.",
      });
    }

    const { url: cutoutUrl, error: cutoutError } = await buildCutout(
      sourcePath,
      path.basename(sourcePath)
    );

    if (!cutoutUrl) {
      return res.status(503).json({
        error: "Background removal failed",
        details: cutoutError || "Le detourage a echoue.",
      });
    }

    if (garment.cutoutUrl && garment.cutoutUrl !== cutoutUrl) {
      deleteLocalAsset(garment.cutoutUrl);
    }

    garment.cutoutUrl = cutoutUrl;
    garment.uploadMeta = mergeUploadMeta(garment.uploadMeta, {
      cutoutStatus: "ready",
      cutoutError: "",
    });
    syncGarmentImageSource(garment, "cutout");
    await garment.save();

    res.json(garment);
  } catch (err) {
    throw err;
  }
});

router.post("/:id/replace-image", auth, validateObjectId("id", "Garment"), upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Image file is required" });
    }

    const garment = await Garment.findOne({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!garment) {
      return res.status(404).json({ error: "Garment not found" });
    }

    const { meta: uploadMeta, error: uploadMetaError } = parseUploadMeta(
      req.body?.uploadMeta
    );
    if (uploadMetaError) {
      return res.status(400).json({
        error: "Invalid upload metadata",
        details: uploadMetaError,
      });
    }

    const previousAssets = [garment.originalUrl, garment.cutoutUrl, garment.imageUrl]
      .filter(Boolean)
      .filter((value, index, array) => array.indexOf(value) === index);

    const originalUrl = `/uploads/${req.file.filename}`;
    const { url: cutoutUrl, error: cutoutError } = await buildCutout(
      req.file.path,
      req.file.filename
    );

    garment.originalUrl = originalUrl;
    garment.cutoutUrl = cutoutUrl;
    garment.imageUrl = cutoutUrl || originalUrl;
    garment.uploadMeta = mergeUploadMeta(uploadMeta, {
      cutoutStatus: cutoutUrl ? "ready" : CUTOUT_ENABLED ? "failed" : "disabled",
      cutoutError: cutoutUrl ? "" : cutoutError,
    });

    await garment.save();
    previousAssets.forEach(deleteLocalAsset);

    res.json(garment);
  } catch (err) {
    throw err;
  }
});

router.patch("/:id/image-source", auth, validateObjectId("id", "Garment"), async (req, res) => {
  try {
    const garment = await Garment.findOne({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!garment) {
      return res.status(404).json({ error: "Garment not found" });
    }

    const source = String(req.body?.source || "").trim().toLowerCase();

    if (!["original", "cutout"].includes(source)) {
      return res.status(400).json({ error: "Invalid image source" });
    }

    if (source === "original" && !garment.originalUrl) {
      return res.status(400).json({ error: "Original image unavailable" });
    }

    if (source === "cutout" && !garment.cutoutUrl) {
      return res.status(400).json({ error: "Cutout image unavailable" });
    }

    syncGarmentImageSource(garment, source);
    await garment.save();

    res.json(garment);
  } catch (err) {
    throw err;
  }
});

router.patch("/laundry/bulk", auth, async (req, res) => {
  try {
    const ids = Array.isArray(req.body?.ids) ? req.body.ids : [];
    const status = String(req.body?.status || "").trim();

    if (!ids.length) {
      return res.status(400).json({ error: "At least one garment id is required" });
    }

    ids.forEach((id) => ensureValidObjectId(id, "Garment"));

    if (!["clean", "dirty"].includes(status)) {
      return res.status(400).json({ error: "Invalid laundry status" });
    }

    const update =
      status === "clean"
        ? { $set: { laundryStatus: status, lastWashedAt: new Date(), wearCountSinceWash: 0 } }
        : { $set: { laundryStatus: status } };

    const result = await Garment.updateMany(
      { _id: { $in: ids }, user: req.user.id },
      update
    );

    res.json({ ok: true, matched: result.matchedCount, modified: result.modifiedCount });
  } catch (err) {
    throw err;
  }
});

router.patch("/:id/laundry", auth, validateObjectId("id", "Garment"), async (req, res) => {
  try {
    const status = String(req.body?.status || "").trim();

    if (!["clean", "dirty"].includes(status)) {
      return res.status(400).json({ error: "Invalid laundry status" });
    }

    const garment = await Garment.findOne({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!garment) {
      return res.status(404).json({ error: "Garment not found" });
    }

    garment.laundryStatus = status;
    if (status === "clean") {
      garment.lastWashedAt = new Date();
      garment.wearCountSinceWash = 0;
    }
    await garment.save();

    res.json(garment);
  } catch (err) {
    throw err;
  }
});

router.patch("/:id/wear", auth, validateObjectId("id", "Garment"), async (req, res) => {
  try {
    const garment = await Garment.findOne({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!garment) {
      return res.status(404).json({ error: "Garment not found" });
    }

    const clearLastWornAt = req.body?.clearLastWornAt === true;
    const wornAt = clearLastWornAt ? null : (req.body?.wornAt ? new Date(req.body.wornAt) : new Date());
    const incrementRaw = req.body?.increment;
    const increment =
      typeof incrementRaw === "number"
        ? incrementRaw
        : incrementRaw === false
          ? 0
          : 1;

    if (wornAt && Number.isNaN(wornAt.getTime())) {
      return res.status(400).json({ error: "Invalid wornAt date" });
    }

    garment.lastWornAt = wornAt;
    garment.wearCount = Math.max(0, Number(garment.wearCount || 0) + increment);
    garment.wearCountSinceWash = Math.max(0, Number(garment.wearCountSinceWash || 0) + increment);
    await garment.save();

    res.json(garment);
  } catch (err) {
    throw err;
  }
});

router.patch("/:id/archive", auth, validateObjectId("id", "Garment"), async (req, res) => {
  try {
    const archived = req.body?.archived !== false;

    const garment = await Garment.findOne({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!garment) {
      return res.status(404).json({ error: "Garment not found" });
    }

    garment.isArchived = archived;
    garment.archivedAt = archived ? new Date() : null;
    await garment.save();

    res.json(garment);
  } catch (err) {
    throw err;
  }
});

router.put("/:id", auth, validateObjectId("id", "Garment"), async (req, res) => {
  try {
    const garment = await Garment.findOne({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!garment) {
      return res.status(404).json({ error: "Garment not found" });
    }

    const { payload, errors } = validateGarmentPayload(req.body);
    if (errors.length) {
      return res.status(400).json({
        error: "Invalid garment payload",
        details: errors.join(" "),
      });
    }

    Object.assign(garment, payload);
    await garment.save();

    res.json(garment);
  } catch (err) {
    throw err;
  }
});

router.delete("/:id", auth, validateObjectId("id", "Garment"), async (req, res) => {
  try {
    const garment = await Garment.findOneAndDelete({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!garment) {
      return res.status(404).json({ error: "Garment not found" });
    }

    [garment.originalUrl, garment.cutoutUrl, garment.imageUrl]
      .filter(Boolean)
      .filter((value, index, array) => array.indexOf(value) === index)
      .forEach(deleteLocalAsset);

    res.json({ ok: true, id: garment._id });
  } catch (err) {
    throw err;
  }
});

export default router;
