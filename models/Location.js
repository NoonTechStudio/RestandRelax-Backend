// models/Location.js
import mongoose from "mongoose";

const LocationSchema = new mongoose.Schema({
  name: { type: String, required: true },
  address: {
    line1: { type: String, required: true },
    line2: { type: String },
    city: { type: String, required: true },
    state: { type: String, required: true },
    pincode: { type: String, required: true },
  },
  coordinates: {  // Change this to nested object
    lat: { type: Number },
    lng: { type: Number }
  },
  description: { type: String },
  capacityOfPersons: { type: Number, required: true }, // total capacity of the property (bedrooms + private villas)
  propertyDetails: {
    bedrooms: { type: Number },
    acBedrooms: { type: Number },
    nonAcBedrooms: { type: Number },
    kitchens: { type: Number },
    livingRooms: { type: Number },
    halls: { type: Number },
    bathrooms: { type: Number },
    swimmingPools: { type: Number },
    privateRooms: { type: Number },
    withFood: { type: Boolean, default: false },
    nightStay: {type: Boolean, default: false},
  },
  amenities: [{ type: String }],

  pricing: {
    pricePerAdult: { type: Number },
    pricePerKid: { type: Number },
    extraPersonCharge: { type: Number },
  },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("Location", LocationSchema);
