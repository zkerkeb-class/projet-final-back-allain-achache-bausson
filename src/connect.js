import "./loadEnv.js";
import mongoose from "mongoose";

const mongoUrl =
  process.env.MONGO_URL ||
  process.env.MONGODB_URI ||
  "mongodb://localhost:27017/projet-db";

const connectDB = async () => {
  try {
    console.log("Tentative de connexion à MongoDB...");
    await mongoose.connect(mongoUrl);
    console.log("Connexion à MongoDB réussie.");
  } catch (error) {
    console.error("Erreur de connexion à MongoDB :", error.message);
    process.exit(1);
  }
};

export default connectDB;
