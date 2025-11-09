import LocationModel from '../models/Location.js';

const createLocation = async (req, res) => {
    try {
        const {locationName, locationDescription} = req.body;
        if (!locationName) return res.status(400).json({success: false, message: "Location name is required"});

        const newLocation = new LocationModel({locationName, locationDescription});
        await newLocation.save();
        res.status(201).json({success: true, data: newLocation});
    }
    catch (error) {
        console.error(error);
        res.status(500).json({success: false, message: "Internal server error"});
    }
}

const getLocations = async (req, res) => {
    try {
        const { forTransfer} = req.query;
        let query = {};
        if (req.user.role !== "admin") {
            if (forTransfer === "true") {
                query = {};
            } else {
                query._id = req.user.locationId;
            }
        } else {
            query.locationName = {$ne: "HQ"}
        }
        const locations = await LocationModel.find(query);
        res.status(200).json({success: true, data: locations});
    }
    catch (error) {
        console.error("Error fetching locations:", error);
        res.status(500).json({success: false, message: "Error fetching locations"});
    }
}

const updateLocation = async (req, res) => {
    try {
        const {id} = req.params; 
        const {locationName, locationDescription} = req.body;

        const updated = await LocationModel.findByIdAndUpdate(
            id,
            {locationName, locationDescription}, 
            {new: true},
        );

        if (!updated )
            return res.status(404).json({success: false, message: "Location not found"});

        res.status(200).json({success: true, data: updated});
    } catch (error) {
        console.error("Error updating location:", error);
        res.status(500).json({success: false, message: "Error updating location"});
    }
}

const deleteLocation = async (req, res) => {
    try {
        const { id } = req.params;
        const deleted = await LocationModel.findByIdAndDelete(id);
        if (!deleted) {
            return res.status(404).json({ success: false, message: "Location not found" });
        }
        res.status(200).json({ success: true, message: "Location deleted successfully" }); 
    } catch (error) {
        console.error("Error deleting location:", error);
        res.status(500).json({success: false, message: "Error deleting location"});
    }
}

export {createLocation, getLocations, updateLocation, deleteLocation};