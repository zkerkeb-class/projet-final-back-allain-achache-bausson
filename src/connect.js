import "./loadEnv.js";
import mongoose from "mongoose";

const mongoUrl =
  process.env.MONGO_URL ||
  process.env.MONGODB_URI ||
  "mongodb://localhost:27017/projet-db";

const connectDB = async () => {
  try {
    console.log("Attempting to connect to MongoDB...");
    await mongoose.connect(mongoUrl);
    console.log("✅ Connected to MongoDB successfully");
  } catch (error) {
    console.error("❌ Error connecting to MongoDB:", error.message);
    process.exit(1);
  }
};

export default connectDB;
