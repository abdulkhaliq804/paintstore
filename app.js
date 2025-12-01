import express from "express";
import path from "path";
import dotenv from "dotenv"; // dotenv for environment variables
import connectDB from "./config/db.js"; 
import { fileURLToPath } from "url"; // for handling ES modules' file paths
import cookieParser from "cookie-parser";
import { isLoggedIn } from "./middleware/isLoggedIn.js";
import { allowRoles } from "./middleware/allowRoles.js";

// import helmet from "helmet";



import authRoutes from "./routes/authRoutes.js";
import productRoutes from "./routes/productRoutes.js";
import saleRoutes from "./routes/saleRoutes.js";
import agentRoutes from "./routes/agentRoutes.js";






dotenv.config();    // Initialize dotenv for environment variables
connectDB();        // connect to MongoDB


// Get __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();


app.disable('x-powered-by');

// app.use(
//   helmet({
//     contentSecurityPolicy: {
//       useDefaults: true,
//       directives: {
//         "script-src": [
//           "'self'",
//           "'unsafe-inline'",
//           "https://unpkg.com",
//           "https://cdn.jsdelivr.net"
//         ],
//         "img-src": ["'self'", "data:", "https:"],
//       },
//     },
//   })
// );


// Middleware
app.use(express.json()); // Replaces body-parser.json()
app.use(express.urlencoded({ extended: true })); // Replaces body-parser.urlencoded()
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Serve static files (for CSS, images, etc.)
app.use(express.static(path.join(__dirname, "public"))); // Customize folder name if needed

app.use(cookieParser()); // must be BEFORE routes


// Routes
app.use("/products", productRoutes);
app.use("/sales", saleRoutes);
app.use("/agents", agentRoutes);
app.use("/auth", authRoutes);



// Default route (redirect to 'add-sale')
app.get("/", (req, res) => res.redirect("/auth/login"));

// app.set('trust proxy', true);


app.get("/home", isLoggedIn, (req, res) => {
  const role=req.user.role;
  // const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  // console.log("Client IP:", ip);
  res.render('home',{role});
});



app.get('/navi-bar',isLoggedIn,allowRoles("admin", "worker"),(req,res)=>{
  const role=req.user.role;
  console.log(role);
  res.render("partials/navbar",{role});
})




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

















