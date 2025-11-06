import mongoose from "mongoose";

const locationSchema = new mongoose.Schema({
  locationName: { type: String, required: true, unique: true, trim: true, default: "Unassigned" },
  locationDescription: { type: String, default : ""},
});

const LocationModel = mongoose.model("Location", locationSchema);
export default LocationModel;
