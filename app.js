import express from "express";
import mongoose from "mongoose";
import path from "path";
import dotenv from "dotenv"; // dotenv for environment variables
import { fileURLToPath } from "url"; // for handling ES modules' file paths



import productRoutes from "./routes/productRoutes.js";
import saleRoutes from "./routes/saleRoutes.js";
import agentRoutes from "./routes/agentRoutes.js";


// Initialize dotenv for environment variables
dotenv.config();

// Get __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Middleware
app.use(express.json()); // Replaces body-parser.json()
app.use(express.urlencoded({ extended: true })); // Replaces body-parser.urlencoded()
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Serve static files (for CSS, images, etc.)
app.use(express.static(path.join(__dirname, "public"))); // Customize folder name if needed


// MongoDB connection using environment variable
mongoose.connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/paintStore", { 
  useNewUrlParser: true, 
  useUnifiedTopology: true 
})
  .then(() => console.log("✅ MongoDB Connected"))
  .catch(err => console.error("❌ MongoDB Error:", err));



// Routes
app.use("/products", productRoutes);
app.use("/sales", saleRoutes);
app.use("/agents", agentRoutes);



// Default route (redirect to 'add-sale')
app.get("/", (req, res) => res.redirect("/sales/add"));



// 404 Error handling for undefined routes
app.use((req, res, next) => {
  res.status(404).send("❌ Page not found.");
});


// Global Error handler
app.use((err, req, res, next) => {
  console.error("❌ Error:", err);
  res.status(500).send("Internal Server Error.");
});


// Server start using environment variable for port
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));





// 10-11-2025 ( Today Task ✅ Done ) 
// add product print page 
// add sale print page    




// 11-11-2025    ?
// add sale page modification?
// custom date filter modification?



// 12-11-2025
// agent side integration with add sale page 



// 13-11-2025
// UI Modification + Responsiveness + Menu bar + Dashboard Home page


// 14-11-2025
// Authentication + protected routes  + middlewares + config


// 15-11-2025
// full admin site Review


// 16-11-2025
// full worker side day 1


// 17-11-2025
// full worker side day 2



// 18-11-2025
// full code review admin + worker side both 


// 19-11-2025
// Deployments + Testing + Fixing


// 20-11-2025
// Deliver to client 










