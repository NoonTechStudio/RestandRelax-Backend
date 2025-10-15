// routes/LocationImageRoutes.js
import express from "express";
import multer from "multer";
import path from "path";
import { createLocationImages, updateLocationImage } from "../controllers/LocationImageController.js";

const router = express.Router();

// Setup Multer Storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, uniqueName);
  },
});

const upload = multer({ storage });

// Routes
router.post("/", upload.array("images", 10), createLocationImages); // ✅ multiple file uploads
router.put("/:id", updateLocationImage);

export default router;
