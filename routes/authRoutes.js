import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import Admin from "../models/Admin.js";
import { isLoggedIn } from "../middleware/isLoggedIn.js";
import { isAlreadyLoggedIn } from "../middleware/isAlreadyLoggedIn.js";
import { allowRoles } from "../middleware/allowRoles.js";


const router = express.Router();



// LOGIN PAGE
router.get("/login",isAlreadyLoggedIn, (req, res) => {
  res.render("login");
});



// =========================
// CREATE ADMIN (ONLY ONCE)
// =========================

router.get("/create-admin", async (req, res) => {
  try {
    // check if admin already exists
    const alreadyAdmin = await Admin.findOne({ role: "admin" });
    if (alreadyAdmin) {
      return res.status(400).json({
        success: false,
        message: "Admin already exists!"
      });
    }

    const username = process.env.ADMIN_USERNAME;
    const password = process.env.ADMIN_PASSWORD;

    if (!username || !password) {
      return res.status(500).json({
        success: false,
        message: "ENV credentials missing!"
      });
    }

    // check if username already exists (IMPORTANT)
    const usernameTaken = await Admin.findOne({ username });
    if (usernameTaken) {
      return res.status(400).json({
        success: false,
        message: "This username is already used! Choose another."
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(password, salt);

    const admin = await Admin.create({
      username,
      role: "admin",
      password: hashed
    });

    return res.json({
      success: true,
      message: "Admin created successfully!",
      admin: {
        username: admin.username,
        createdAt: admin.createdAt
      }
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: "Server error creating admin!"
    });
  }
});


// ===========================
// CREATE WORKER (ONLY ONCE)
// ===========================

router.get("/create-worker", async (req, res) => {
  try {
    // check if worker already exists
    const alreadyWorker = await Admin.findOne({ role: "worker" });
    if (alreadyWorker) {
      return res.status(400).json({
        success: false,
        message: "Worker already exists!"
      });
    }

    const username = process.env.WORKER_USERNAME;
    const password = process.env.WORKER_PASSWORD;

    if (!username || !password) {
      return res.status(500).json({
        success: false,
        message: "ENV credentials missing!"
      });
    }

    // check if username already exists (IMPORTANT)
    const usernameTaken = await Admin.findOne({ username });
    if (usernameTaken) {
      return res.status(400).json({
        success: false,
        message: "This username is already used! Choose another."
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(password, salt);

    const worker = await Admin.create({
      username,
      role: "worker",
      password: hashed
    });

    return res.json({
      success: true,
      message: "Worker created successfully!",
      worker: {
        username: worker.username,
        createdAt: worker.createdAt
      }
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: "Server error creating worker!"
    });
  }
});



// LOGIN POST
router.post("/login",isAlreadyLoggedIn, async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, message: "All fields are required!" });
    }

    // find user (admin or worker)
    const user = await Admin.findOne({ username });
    if (!user) {
      return res.status(401).json({ success: false, message: "Username or password is wrong!" });
    }

    // check password
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ success: false, message: "Username or password is wrong!" });
    }

    // create token WITH ROLE
    const token = jwt.sign(
      { 
        id: user._id,
        username: user.username,
        role: user.role     // ✔ ADDED
      },
      process.env.SECRET_KEY,
      { expiresIn: "1d" }
    );

    res.cookie("token", token, {
      httpOnly: true,
      secure: false,
      maxAge: 24 * 60 * 60 * 1000
    });

    return res.json({
      success: true,
      message: "Logged in successfully!"
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: "Server error! Please try again."
    });
  }
});





// LOGOUT
router.get("/logout",isLoggedIn,allowRoles("admin", "worker"), (req, res) => {
  res.clearCookie("token");
  res.redirect("/auth/login");
});





export default router;
