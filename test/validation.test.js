import test from "node:test";
import assert from "node:assert/strict";
import { validateCredentials } from "../src/utils/authValidation.js";
import { validateGarmentPayload } from "../src/utils/garmentValidation.js";
import {
  validateOutfitMetaPayload,
  validateOutfitPayload,
} from "../src/utils/outfitValidation.js";

test("validateCredentials normalizes email and rejects short passwords", () => {
  const result = validateCredentials({
    email: "  USER@Example.COM ",
    password: "short",
  });

  assert.equal(result.email, "user@example.com");
  assert.match(result.errors.join(" "), /8 caracteres/);
});

test("validateGarmentPayload rejects future purchase dates and negative prices", () => {
  const result = validateGarmentPayload({
    category: "top",
    color: "noir",
    price: "-5",
    purchaseDate: "2999-01-01",
  });

  assert.match(result.errors.join(" "), /positif/);
  assert.match(result.errors.join(" "), /futur/);
});

test("validateGarmentPayload normalizes text fields", () => {
  const result = validateGarmentPayload({
    category: "top",
    color: "blanc",
    brand: "  zArA ",
    material: "  cOtOn ",
    purchaseLocation: "  vinted  ",
    seasons: ["Ete", "hiver", "ete"],
    weatherTags: '["Pluie","beau temps","unknown"]',
    contexts: ["Bureau", "voyage"],
  });

  assert.equal(result.payload.brand, "Zara");
  assert.equal(result.payload.material, "Coton");
  assert.equal(result.payload.purchaseLocation, "Vinted");
  assert.deepEqual(result.payload.seasons, ["ete", "hiver"]);
  assert.deepEqual(result.payload.weatherTags, ["pluie", "beau temps"]);
  assert.deepEqual(result.payload.contexts, ["bureau", "voyage"]);
  assert.equal(result.errors.length, 0);
});

test("validateOutfitPayload clamps coordinates and rejects invalid categories", () => {
  const valid = validateOutfitPayload({
    name: "Look test",
    status: "retest",
    isFavorite: true,
    items: [{ category: "top", garment: "abc123", x: 120, y: -10, size: 300, zIndex: 99, rotation: 500 }],
  });

  assert.equal(valid.errors.length, 0);
  assert.equal(valid.items[0].x, 100);
  assert.equal(valid.items[0].y, 0);
  assert.equal(valid.items[0].size, 90);
  assert.equal(valid.items[0].zIndex, 20);
  assert.equal(valid.items[0].rotation, 360);
  assert.equal(valid.status, "retest");
  assert.equal(valid.isFavorite, true);

  const invalid = validateOutfitPayload({
    name: "Look test",
    status: "invalid",
    isFavorite: "maybe",
    items: [{ category: "unknown", garment: "abc123" }],
  });

  assert.match(invalid.errors.join(" "), /categorie/);
  assert.match(invalid.errors.join(" "), /statut/);
  assert.match(invalid.errors.join(" "), /favori/);
});

test("validateOutfitMetaPayload accepts favorite and status patches", () => {
  const valid = validateOutfitMetaPayload({
    status: "archived",
    isFavorite: false,
  });

  assert.equal(valid.errors.length, 0);
  assert.deepEqual(valid.updates, {
    status: "archived",
    isFavorite: false,
  });

  const invalid = validateOutfitMetaPayload({});
  assert.match(invalid.errors.join(" "), /Aucune mise a jour/);
});
