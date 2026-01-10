import mongoose from "mongoose";
import dotenv from "dotenv";

// Load .env
dotenv.config();

const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGO_URI;

    if (!mongoURI) {
      throw new Error("❌ MONGO_URI not defined in .env file");
    }

    // ✅ Connect without deprecated options
    await mongoose.connect(mongoURI);

    console.log("✅ MongoDB Connected Successfully");
  } catch (err) {
    console.error("❌ MongoDB Connection Error:", err);
    process.exit(1); // Stop the app on DB failure
  }
};

export default connectDB;
