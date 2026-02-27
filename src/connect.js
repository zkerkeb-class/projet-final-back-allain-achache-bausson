import mongoose from "mongoose";

console.log("Attempting to connect to MongoDB...");

const connectDB = async () => {
  try {
    await mongoose.connect("mongodb://localhost:27017/projet-db");
    console.log("✅ Connected to MongoDB successfully");
  } catch (error) {
    console.error("❌ Error connecting to MongoDB:", error.message);
    process.exit(1);
  }
};

export default connectDB;

connectDB();