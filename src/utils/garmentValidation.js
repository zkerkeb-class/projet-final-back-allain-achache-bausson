export const garmentCategories = [
  "top",
  "bottom",
  "dress",
  "shoes",
  "outer",
  "accessory",
  "bag",
  "hat",
];

export const garmentColors = [
  "blanc",
  "noir",
  "beige",
  "bleu",
  "rouge",
  "vert",
  "rose",
  "jaune",
  "marron",
  "gris",
  "violet",
  "orange",
  "dore",
  "argente",
  "multi",
];

export const garmentOrigins = ["neuf", "seconde main", "cadeau", "location", "autre"];
export const garmentOccasions = ["casual", "travail", "soiree", "sport", "ceremonie", "vacances"];
export const garmentSeasons = ["printemps", "ete", "automne", "hiver"];
export const garmentWeatherTags = ["froid", "doux", "chaud", "pluie", "beau temps"];
export const garmentContexts = ["interieur", "exterieur", "bureau", "soiree", "voyage"];
export const garmentLaundryStatuses = ["clean", "dirty"];
export const garmentConditions = ["perfect", "good", "bad"];

const MAX_TEXT_LENGTH = 160;
const MAX_NOTES_LENGTH = 800;

const toOptionalString = (value) => {
  if (value == null) return "";
  return String(value).trim();
};

export const normalizeWhitespace = (value) => toOptionalString(value).replace(/\s+/g, " ").trim();

export const toTitleCase = (value) =>
  normalizeWhitespace(value)
    .toLowerCase()
    .replace(/\b\p{L}/gu, (letter) => letter.toUpperCase());

const toOptionalNumber = (value) => {
  if (value == null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const toOptionalDate = (value) => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const toStringArray = (value) => {
  if (Array.isArray(value)) {
    return value.map((entry) => String(entry).trim()).filter(Boolean);
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return [];

    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.map((entry) => String(entry).trim()).filter(Boolean);
      }
    } catch {}

    return trimmed
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean);
  }

  return [];
};

const toEnumValue = (value, allowedValues, fallback = "") => {
  const normalized = normalizeWhitespace(value).toLowerCase();
  return allowedValues.includes(normalized) ? normalized : fallback;
};

const toEnumArray = (value, allowedValues) => {
  return [...new Set(toStringArray(value).map((entry) => entry.toLowerCase()))].filter((entry) =>
    allowedValues.includes(entry)
  );
};

export const buildGarmentPayload = (body) => {
  const rawCategory = normalizeWhitespace(body.category).toLowerCase();
  const category = rawCategory === "earrings" || rawCategory === "necklace"
    ? "accessory"
    : toEnumValue(body.category, garmentCategories);

  return {
    title: normalizeWhitespace(body.title),
    category,
    color: toEnumValue(body.color, garmentColors),
    secondaryColor: toEnumValue(body.secondaryColor, garmentColors),
    brand: toTitleCase(body.brand),
    price: toOptionalNumber(body.price),
    purchaseDate: toOptionalDate(body.purchaseDate),
    purchaseLocation: toTitleCase(body.purchaseLocation),
    origin: toEnumValue(body.origin, garmentOrigins),
    size: normalizeWhitespace(body.size),
    material: toTitleCase(body.material),
    occasions: toEnumArray(body.occasions, garmentOccasions),
    seasons: toEnumArray(body.seasons, garmentSeasons),
    weatherTags: toEnumArray(body.weatherTags, garmentWeatherTags),
    contexts: toEnumArray(body.contexts, garmentContexts),
    condition: toEnumValue(body.condition, garmentConditions, "good"),
    laundryStatus: toEnumValue(body.laundryStatus, garmentLaundryStatuses, "clean"),
    notes: normalizeWhitespace(body.notes),
  };
};

export const validateGarmentPayload = (body) => {
  const payload = buildGarmentPayload(body);
  const errors = [];

  if (!payload.category) {
    errors.push("Categorie invalide.");
  }

  if (!payload.color) {
    errors.push("Couleur invalide.");
  }

  if (body.secondaryColor !== undefined && body.secondaryColor !== "" && !payload.secondaryColor) {
    errors.push("Deuxieme couleur invalide.");
  }

  if (body.price !== undefined && body.price !== "" && payload.price == null) {
    errors.push("Prix invalide.");
  }

  if (payload.price != null && payload.price < 0) {
    errors.push("Le prix doit etre positif.");
  }

  if (body.purchaseDate && !payload.purchaseDate) {
    errors.push("Date d'achat invalide.");
  }

  if (payload.purchaseDate && payload.purchaseDate > new Date()) {
    errors.push("La date d'achat ne peut pas etre dans le futur.");
  }

  if (payload.title.length > MAX_TEXT_LENGTH) {
    errors.push("Le nom est trop long.");
  }

  if (payload.brand.length > MAX_TEXT_LENGTH) {
    errors.push("La marque est trop longue.");
  }

  if (payload.purchaseLocation.length > MAX_TEXT_LENGTH) {
    errors.push("Le lieu d'achat est trop long.");
  }

  if (payload.size.length > MAX_TEXT_LENGTH) {
    errors.push("La taille est trop longue.");
  }

  if (payload.material.length > MAX_TEXT_LENGTH) {
    errors.push("La matiere est trop longue.");
  }

  if (payload.notes.length > MAX_NOTES_LENGTH) {
    errors.push("Les notes sont trop longues.");
  }

  if (body.laundryStatus !== undefined && !garmentLaundryStatuses.includes(payload.laundryStatus)) {
    errors.push("Etat du vetement invalide.");
  }

  if (body.condition !== undefined && !garmentConditions.includes(payload.condition)) {
    errors.push("Etat de conservation invalide.");
  }

  return { payload, errors };
};
