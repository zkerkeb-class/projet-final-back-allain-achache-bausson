import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { createApp } from "../src/index.js";
import validateObjectId, {
  ensureValidObjectId,
} from "../src/middleware/validateObjectId.js";
import { errorHandler } from "../src/middleware/errorHandler.js";
import { badRequest } from "../src/utils/http.js";

const withServer = async (app, run) => {
  const server = await new Promise((resolve) => {
    const instance = app.listen(0, () => resolve(instance));
  });

  const { port } = server.address();

  try {
    await run(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  }
};

test("createApp returns consistent 404 json payload", async () => {
  await withServer(createApp(), async (baseUrl) => {
    const response = await fetch(`${baseUrl}/missing-route`);
    const body = await response.json();

    assert.equal(response.status, 404);
    assert.equal(body.error, "Route not found");
    assert.match(body.details, /GET \/missing-route/);
  });
});

test("errorHandler formats thrown http errors", async () => {
  const app = express();

  app.get("/boom", () => {
    throw badRequest("Invalid payload");
  });
  app.use(errorHandler);

  await withServer(app, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/boom`);
    const body = await response.json();

    assert.equal(response.status, 400);
    assert.equal(body.error, "Invalid payload");
    assert.equal(body.details, "Invalid payload");
  });
});

test("ensureValidObjectId rejects invalid mongo ids", () => {
  assert.throws(() => ensureValidObjectId("abc", "Garment"), /invalid garment id/i);
});

test("validateObjectId middleware calls next with a known error", () => {
  const middleware = validateObjectId("id", "Outfit");
  let forwardedError = null;

  middleware(
    { params: { id: "bad-id" } },
    {},
    (err) => {
      forwardedError = err;
    }
  );

  assert.ok(forwardedError);
  assert.equal(forwardedError.status, 400);
  assert.match(forwardedError.message, /invalid outfit id/i);
});
