import { HttpError } from "../utils/http.js";

export const notFoundHandler = (req, res) => {
  res.status(404).json({
    error: "Route not found",
    details: `${req.method} ${req.originalUrl}`,
  });
};

export const errorHandler = (err, req, res, _next) => {
  if (res.headersSent) {
    return;
  }

  const isKnownError = err instanceof HttpError;
  const status = isKnownError ? err.status : 500;
  const error = isKnownError ? err.message : "Internal server error";
  const details = isKnownError
    ? err.details || err.message
    : err?.message || "Internal server error";

  res.status(status).json({ error, details });
};
