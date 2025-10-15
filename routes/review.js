const express = require("express");
const router = express.Router();
const {
  createReview,
  getReviews,
  getReviewById,
  getReviewsByLocation,
  updateReview,
  deleteReview
} = require("../controllers/reviewController");

// Create a new review
router.post("/", createReview);

// Get all reviews with filtering and pagination
router.get("/", getReviews);

// Get review by ID
router.get("/:id", getReviewById);

// Get reviews by location ID
router.get("/location/:locationId", getReviewsByLocation);

// Update a review
router.put("/:id", updateReview);

// Delete a review
router.delete("/:id", deleteReview);

module.exports = router;