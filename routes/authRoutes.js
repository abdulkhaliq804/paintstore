import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { isLoggedIn } from "../middleware/isLoggedIn.js";
import { isAlreadyLoggedIn } from "../middleware/isAlreadyLoggedIn.js";
import { allowRoles } from "../middleware/allowRoles.js";
import { checkIPBlocked } from "../middleware/checkIPBlocked.js";
import { ensure2FA } from "../middleware/ensure2FA.js";
import rateLimit from "express-rate-limit";
import nodemailer from "nodemailer";
import Admin from "../models/Admin.js";
import BlockedIP from "../models/BlockedIP.js";


const router = express.Router();



// LOGIN PAGE
router.get("/login",isAlreadyLoggedIn, (req, res) => {
  res.render("login");
});



// ==========================================
// CREATE ADMIN (ONLY ONCE) auth/create-admin
// ===========================================


// router.get("/create-admin", async (req, res) => {
//   try {
//     // check if admin already exists
//     const alreadyAdmin = await Admin.findOne({ role: "admin" });
//     if (alreadyAdmin) {
//       return res.status(400).json({
//         success: false,
//         message: "Admin already exists!"
//       });
//     }

//     const username = process.env.ADMIN_USERNAME;
//     const password = process.env.ADMIN_PASSWORD;

//     if (!username || !password) {
//       return res.status(500).json({
//         success: false,
//         message: "ENV credentials missing!"
//       });
//     }

//     // check if username already exists (IMPORTANT)
//     const usernameTaken = await Admin.findOne({ username });
//     if (usernameTaken) {
//       return res.status(400).json({
//         success: false,
//         message: "This username is already used! Choose another."
//       });
//     }

//     const salt = await bcrypt.genSalt(10);
//     const hashed = await bcrypt.hash(password, salt);

//     const admin = await Admin.create({
//       username,
//       role: "admin",
//       password: hashed
//     });

//     return res.json({
//       success: true,
//       message: "Admin created successfully!",
//       admin: {
//         username: admin.username,
//         createdAt: admin.createdAt
//       }
//     });

//   } catch (err) {
//     console.error(err);
//     return res.status(500).json({
//       success: false,
//       message: "Server error creating admin!"
//     });
//   }
// });


// ============================================
// CREATE WORKER (ONLY ONCE) auth/create-worker
// ============================================

// router.get("/create-worker", async (req, res) => {
//   try {
//     // check if worker already exists
//     const alreadyWorker = await Admin.findOne({ role: "worker" });
//     if (alreadyWorker) {
//       return res.status(400).json({
//         success: false,
//         message: "Worker already exists!"
//       });
//     }

//     const username = process.env.WORKER_USERNAME;
//     const password = process.env.WORKER_PASSWORD;

//     if (!username || !password) {
//       return res.status(500).json({
//         success: false,
//         message: "ENV credentials missing!"
//       });
//     }

//     // check if username already exists (IMPORTANT)
//     const usernameTaken = await Admin.findOne({ username });
//     if (usernameTaken) {
//       return res.status(400).json({
//         success: false,
//         message: "This username is already used! Choose another."
//       });
//     }

//     const salt = await bcrypt.genSalt(10);
//     const hashed = await bcrypt.hash(password, salt);

//     const worker = await Admin.create({
//       username,
//       role: "worker",
//       password: hashed
//     });

//     return res.json({
//       success: true,
//       message: "Worker created successfully!",
//       worker: {
//         username: worker.username,
//         createdAt: worker.createdAt
//       }
//     });

//   } catch (err) {
//     console.error(err);
//     return res.status(500).json({
//       success: false,
//       message: "Server error creating worker!"
//     });
//   }
// });




const loginLimiter = rateLimit({
  windowMs: 2 * 60 * 1000, // 2 minute
  max: 5,
  handler: async (req, res) => {
    const ip = req.ip;

    console.log("⚠️ Blocking IP permanently:", ip);

    await BlockedIP.create({ ip });

    return res.status(429).json({
      success: false,
      message: `Too many attempts! Your IP ${ip} is permanently blocked.`
    });
  }
});




// LOGIN POST
router.post("/login", checkIPBlocked, loginLimiter, isAlreadyLoggedIn, async (req, res) => {
  try {
    const { username, password } = req.body;

    // 1. Check fields
    if (!username || !password) {
      return res.status(400).json({ success: false, message: "All fields are required!" });
    }

    // 2. Find user
    const user = await Admin.findOne({ username });
    if (!user) {
      return res.status(401).json({ success: false, message: "Username or password is wrong!" });
    }

    // 3. Verify Password
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ success: false, message: "Username or password is wrong!" });
    }

    // 4. CREATE JWT TOKEN
    const token = jwt.sign(
      { id: user._id, username: user.username, role: user.role },
      process.env.SECRET_KEY,
      { expiresIn: "365d" }
    );

    // 5. Set Cookie (Railway & Localhost friendly)
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production", 
      sameSite: "strict",
      maxAge: 365 * 24 * 60 * 60 * 1000 // 1 year
    });

    // 6. Final Success Response
    return res.json({ 
      success: true, 
      message: "Login successful! Redirecting...",
      redirectHome: true // Frontend par ab seedha dashboard bhej dena
    });

  } catch (err) {
    console.error("🔥 Global Error:", err);
    return res.status(500).json({ success: false, message: "Server error! Please try again." });
  }
});




// router.get('/2FA',ensure2FA,(req,res)=>{
// res.render("2FA");
// });



// VERIFY OTP
// router.post("/verify-otp", ensure2FA, async (req, res) => {
//   try {
//     const { otp } = req.body;

//     // 1. Validation: OTP khali na ho
//     if (!otp) {
//       return res.status(400).json({ success: false, message: "OTP is required!" });
//     }

//     // 2. CastError Fix: Check karein ke OTP sirf numbers hain
//     const otpNumber = Number(otp);
//     if (isNaN(otpNumber)) {
//       return res.status(400).json({ 
//         success: false, 
//         message: "Invalid OTP format! Please enter numbers only." 
//       });
//     }

//     // 3. Find user with matching OTP and valid expiry
//     // Hum otpNumber use kar rahe hain taake database crash na ho
//     const user = await Admin.findOne({
//       otp: otpNumber, 
//       otpExpires: { $gt: Date.now() } // OTP expired na ho
//     });

//     if (!user) {
//       return res.status(400).json({ success: false, message: "Invalid or expired OTP!" });
//     }

//     // 4. Success: OTP correct hai → Clear OTP fields
//     user.otp = null;
//     user.otpExpires = null;
//     await user.save();
    
//     // 5. 🔥 Destroy Temporary Session (Security)
//     req.session.destroy(err => {
//       if (err) console.error("Session destroy error:", err);
//     });

//     // 6. 🔥 Remove temporary session cookie
//     res.clearCookie("connect.sid");

//     // 7. CREATE JWT TOKEN (Final Auth)
//     const token = jwt.sign(
//       { id: user._id, username: user.username, role: user.role },
//       process.env.SECRET_KEY,
//       { expiresIn: "365d" }
//     );

//     // 8. Set Cookie with Production/Live checks
//     res.cookie("token", token, {
//       httpOnly: true,
//       secure: process.env.NODE_ENV === "production", // Live (Railway/Vercel) par true hoga
//       sameSite: "strict",
//       maxAge: 365 * 24 * 60 * 60 * 1000 // 1 year
//     });

//     return res.json({ success: true, message: "OTP verified successfully!" });

//   } catch (err) {
//     console.error("Verification API Error:", err);
//     return res.status(500).json({ success: false, message: "Server error. Try again!" });
//   }
// });



// LOGOUT FROM 2FA PAGE
// router.post("/logout-2fa",ensure2FA,(req, res) => {
//   // Destroy session
//   req.session.destroy(err => {
//     if (err) {
//       console.error(err);
//       return res.status(500).json({ success: false, message: "Could not log out!" });
//     }
//     // Clear connect.sid cookie
//     res.clearCookie("connect.sid");
//     return res.json({ success: true, message: "Logged out successfully!" });
//   });
// });



// LOGOUT
router.get("/logout",isLoggedIn,allowRoles("admin", "worker"), (req, res) => {
  res.clearCookie("token");
  res.redirect("/auth/login");
});





export default router;
