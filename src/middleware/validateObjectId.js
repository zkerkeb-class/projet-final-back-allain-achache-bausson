import mongoose from "mongoose";
import { badRequest } from "../utils/http.js";

export const ensureValidObjectId = (value, label = "Resource") => {
  if (!mongoose.isValidObjectId(value)) {
    throw badRequest(`Invalid ${label.toLowerCase()} id`);
  }
};

const validateObjectId = (paramName = "id", label = "Resource") => (req, _res, next) => {
  try {
    ensureValidObjectId(req.params?.[paramName], label);
    next();
  } catch (err) {
    next(err);
  }
};

export default validateObjectId;
