export class HttpError extends Error {
  constructor(status, message, details = "") {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.details = details || message;
  }
}

export const createHttpError = (status, message, details = "") =>
  new HttpError(status, message, details);

export const badRequest = (message, details = "") =>
  createHttpError(400, message, details);

export const unauthorized = (message, details = "") =>
  createHttpError(401, message, details);

export const notFound = (message, details = "") =>
  createHttpError(404, message, details);

export const serviceUnavailable = (message, details = "") =>
  createHttpError(503, message, details);
