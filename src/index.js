import express from "express";
import cors from "cors";
import { fileURLToPath } from "url";
import "./loadEnv.js";

import connectDB from "./connect.js";
import garmentsRoutes from "./routes/garments.js";
import authRoutes from "./routes/auth.js";
import outfitsRoutes from "./routes/outfits.js";
import calendarRoutes from "./routes/calendar.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";

export const createApp = () => {
  const app = express();

  app.use(cors());
  app.use(express.json());
  app.use("/uploads", express.static("uploads"));

  app.use("/api/auth", authRoutes);
  app.use("/api/garments", garmentsRoutes);
  app.use("/api/outfits", outfitsRoutes);
  app.use("/api/calendar", calendarRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};

const currentFile = fileURLToPath(import.meta.url);

if (process.argv[1] === currentFile) {
  const app = createApp();
  const PORT = process.env.PORT || 5000;

  connectDB().then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  });
}
