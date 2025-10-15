import express from "express";
import {
  createLocation,
  updateLocation,
  getLocations,
  getLocationById,
} from "../controllers/LocationController.js";

const router = express.Router();

router.post("/", createLocation);
router.put("/:id", updateLocation);
router.get("/", getLocations);
router.get("/:id", getLocationById);

export default router;
