import mongoose from "mongoose";

const adminSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true, 
    unique: true 
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ["admin", "worker"],  // ✔ allowed roles
    required: true              // ✔ default nahi, user ko role dena hoga
  }
}, { timestamps: true });

export default mongoose.model("Admin", adminSchema);
