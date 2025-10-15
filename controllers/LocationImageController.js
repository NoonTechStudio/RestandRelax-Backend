import LocationImage from "../models/LocationImage.js";
import path from "path";

// Add image for a location
export const createLocationImages = async (req, res) => {
  try {
    const { locationId, imageDetails } = req.body;

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: "No images uploaded" });
    }

    // Parse image details from frontend
    const parsedImageDetails = JSON.parse(imageDetails || "[]");

    // Map uploaded files with details from frontend
    const imageObjects = req.files.map((file, index) => ({
      url: `/uploads/${file.filename}`,
      alt: parsedImageDetails[index]?.alt || "",
      title: parsedImageDetails[index]?.title || `Image ${index + 1}`,
      isMainImage: parsedImageDetails[index]?.isMainImage || false,
      order: parsedImageDetails[index]?.order || index
    }));

    // Check if entry exists for this location
    let locationImage = await LocationImage.findOne({ location: locationId });

    if (locationImage) {
      // If exists, push new images to the array
      locationImage.images.push(...imageObjects);
      await locationImage.save();
    } else {
      // If not, create a new one
      locationImage = new LocationImage({
        location: locationId,
        images: imageObjects,
      });
      await locationImage.save();
    }

    res.status(201).json(locationImage);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

// Update image
export const updateLocationImage = async (req, res) => {
  try {
    const image = await LocationImage.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(image);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};