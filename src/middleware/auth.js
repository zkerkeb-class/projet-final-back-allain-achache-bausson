import "../loadEnv.js";
import jwt from "jsonwebtoken";
import { unauthorized } from "../utils/http.js";

const JWT_SECRET = process.env.JWT_SECRET || "SECRET_KEY";

export default function auth(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return next(unauthorized("Token manquant"));
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    next(unauthorized("Token invalide"));
  }
}
