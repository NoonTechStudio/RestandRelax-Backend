import Location from "../models/Location.js"; 
import LocationImage from "../models/LocationImage.js";

// Create Location
export const createLocation = async (req, res) => {
  try {
    const location = new Location(req.body);
    await location.save();
    res.status(201).json(location);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Update Location
export const updateLocation = async (req, res) => {
  try {
    const location = await Location.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(location);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Get all Locations
export const getLocations = async (req, res) => {
  try {
    const locations = await Location.find();
    res.json(locations);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get single Location with images
export const getLocationById = async (req, res) => {
  try {
    const location = await Location.findById(req.params.id);
    if (!location) return res.status(404).json({ error: "Location not found" });

    // fetch location images from LocationImage collection
    const images = await LocationImage.findOne({ location: req.params.id });

    res.json({
      ...location.toObject(),
      images: images ? images.images : [], // array of {url, alt}
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

export const deleteLocation = async (req, res) => {
  try {
    const { id } = req.params;

    const location = await Location.findByIdAndDelete(id);

    if (!location) {
      return res.status(404).json({
        success: false,
        error: "Location not found",
      });
    }

    res.json({
      success: true,
      message: "Location deleted successfully",
      location, // Optional: return deleted location details
    });
  } catch (err) {
    console.error("Delete location error:", err);
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
};
