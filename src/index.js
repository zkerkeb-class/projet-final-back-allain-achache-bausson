import express from "express";
import cors from "cors";
import "./connect.js";

import garmentsRoutes from "./routes/garments.js";
import authRoutes from "./routes/auth.js";

const app = express();

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static("uploads"));

app.use("/api/auth", authRoutes);
app.use("/api/garments", garmentsRoutes);

app.listen(5000, () => {
  console.log("Server running on http://localhost:3000");
});