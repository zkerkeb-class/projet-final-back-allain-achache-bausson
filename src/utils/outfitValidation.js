import { garmentCategories } from "./garmentValidation.js";

export const outfitStatuses = ["active", "retest", "archived"];

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const toNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const hasOwn = (value, key) =>
  Object.prototype.hasOwnProperty.call(Object(value), key);

const normalizeStatus = (value) => {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();

  return outfitStatuses.includes(normalized) ? normalized : "";
};

const normalizeFavorite = (value) => {
  if (typeof value === "boolean") {
    return value;
  }

  if (value === "true") {
    return true;
  }

  if (value === "false") {
    return false;
  }

  return null;
};

const normalizePersonalNote = (value) => {
  const normalized = String(value || "").trim();
  return normalized.slice(0, 500);
};

const normalizePersonalRating = (value) => {
  if (value == null || value === "") {
    return null;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 5) {
    return null;
  }

  return parsed;
};

export const toOutfitItems = (incomingItems) =>
  incomingItems
    .filter((item) => item?.garment)
    .map((item) => ({
      category: String(item.category || "").trim(),
      garment: String(item.garment || "").trim(),
      x: clamp(toNumber(item.x, 50), 0, 100),
      y: clamp(toNumber(item.y, 50), 0, 100),
      size: clamp(toNumber(item.size, 30), 8, 90),
      zIndex: clamp(toNumber(item.zIndex, 1), 1, 20),
      rotation: clamp(toNumber(item.rotation, 0), -360, 360),
    }));

export const validateOutfitPayload = (body) => {
  const name = String(body?.name || "").trim();
  const incomingItems = Array.isArray(body?.items) ? body.items : [];
  const items = toOutfitItems(incomingItems);
  const errors = [];
  const status = normalizeStatus(body?.status || "active");
  const favoriteValue = hasOwn(body, "isFavorite")
    ? normalizeFavorite(body?.isFavorite)
    : false;
  const personalNote = normalizePersonalNote(body?.personalNote);
  const personalRating = hasOwn(body, "personalRating")
    ? normalizePersonalRating(body?.personalRating)
    : null;

  if (!name) {
    errors.push("Le nom de la tenue est requis.");
  } else if (name.length > 80) {
    errors.push("Le nom de la tenue est trop long.");
  }

  if (!items.length) {
    errors.push("Ajoute au moins un vetement a la tenue.");
  }

  if (items.some((item) => !item.garment)) {
    errors.push("Chaque piece doit referencer un vetement.");
  }

  if (items.some((item) => !garmentCategories.includes(item.category))) {
    errors.push("Une categorie de tenue est invalide.");
  }

  if (!status) {
    errors.push("Le statut de la tenue est invalide.");
  }

  if (favoriteValue == null) {
    errors.push("Le drapeau favori est invalide.");
  }

  if (hasOwn(body, "personalRating") && personalRating == null) {
    errors.push("La note perso doit etre comprise entre 1 et 5.");
  }

  return {
    name,
    items,
    status: status || "active",
    isFavorite: favoriteValue ?? false,
    personalNote,
    personalRating,
    errors,
  };
};

export const validateOutfitMetaPayload = (body) => {
  const errors = [];
  const updates = {};

  if (hasOwn(body, "status")) {
    const status = normalizeStatus(body?.status);
    if (!status) {
      errors.push("Le statut de la tenue est invalide.");
    } else {
      updates.status = status;
    }
  }

  if (hasOwn(body, "isFavorite")) {
    const isFavorite = normalizeFavorite(body?.isFavorite);
    if (isFavorite == null) {
      errors.push("Le drapeau favori est invalide.");
    } else {
      updates.isFavorite = isFavorite;
    }
  }

  if (hasOwn(body, "personalNote")) {
    updates.personalNote = normalizePersonalNote(body?.personalNote);
  }

  if (hasOwn(body, "personalRating")) {
    if (body?.personalRating === "" || body?.personalRating == null) {
      updates.personalRating = null;
    } else {
      const personalRating = normalizePersonalRating(body?.personalRating);
      if (personalRating == null) {
        errors.push("La note perso doit etre comprise entre 1 et 5.");
      } else {
        updates.personalRating = personalRating;
      }
    }
  }

  if (!Object.keys(updates).length) {
    errors.push("Aucune mise a jour de tenue n'a ete fournie.");
  }

  return { updates, errors };
};
