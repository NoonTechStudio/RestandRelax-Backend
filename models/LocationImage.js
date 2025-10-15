const mongoose = require("mongoose");

const ImageSchema = new mongoose.Schema({
  url: { type: String, required: true },
  alt: { type: String },
  title: { type: String, required: true }, // Only title added
  isMainImage: { type: Boolean, default: false }, // Main image checkbox
  order: { type: Number, default: 0 }
});

const LocationImageSchema = new mongoose.Schema({
  location: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Location",
    required: true,
  },
  images: [ImageSchema],
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("LocationImage", LocationImageSchema);