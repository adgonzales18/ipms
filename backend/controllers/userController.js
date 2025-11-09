import User from '../models/User.js';
import bcrypt from 'bcrypt';

const getUsers = async (req, res) => {
    try {

        // Only allow admin to fetch all user information
        if (req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        const users = await User.find()
        .populate("locationId")
        .select("-password");

        res.status(200).json({success: true, data: users});
    }
    catch (error) {
        console.error("Error fetching users:", error);
        res.status(500).json({success: false, message: "Internal server error"});
    }
};

const getUserbyId= async (req, res) => {
    try {
        const {id} = req.params;

        // Only allow admin or same user to access user information
        if (req.user.id !== id && req.user.role !== "admin") {
            return res.status(403).json({success: false, message: "Not authorized"});
        }

        const user = await User.findById(id)
        .populate("locationId")
        .select("-password");

       if (!user)
        return res.status(404).json({success: false, message: "User not found"});

        res.status(200).json({success: true, data: user});
    } catch (error) {
        console.error("Error fetching user by ID:", error);
        res.status(500).json({success: false, message: "Internal server error"});
    }
};

const createUser = async (req, res) => {
    try {
        // Only admins can create new users.
        if (req.user.role !== "admin") {
            return res.status(403).json({success: false, message: "Not authorized"});
        }
        const {name, email, password, address, role, locationId, image} = req.body;
        
        const existing = await User.findOne({email});
        if (existing) {
            return res.status(400).json({success: false, message: "User already exists"});
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = new User({
            name,
            email,
            password: hashedPassword,
            address,
            role,
            locationId,
            image,
        });

        await newUser.save();
        res.status(201).json({success: true, data: newUser}); 
    } catch (error) {
        console.error(error);
        res.status(500).json({success: false, message: "Internal server error"});
    }
};

const updateUser = async (req, res) => {
    try {
        const { id } = req.params;
    
        // Only allow admin or same user to update
        if (req.user.id !== id && req.user.role !== "admin") {
          return res.status(403).json({ success: false, message: "Not authorized" });
        }
    
        const { name, email, password, address, role, locationId, image } = req.body;
    
        const user = await User.findById(id);
        if (!user)
          return res.status(404).json({ success: false, message: "User not found" });
    
        // Prevent non-admin from changing role
        if (req.user.role !== "admin" && role && role !== user.role) {
          return res
            .status(403)
            .json({ success: false, message: "Cannot change role" });
        }
    
        if (name) user.name = name;
        if (email) user.email = email;
        if (address) user.address = address;
        if (image) user.image = image;
        if (req.user.role === "admin" && role) user.role = role;
        if (locationId) user.locationId = locationId;
    
        if (password) {
          const hashed = await bcrypt.hash(password, 10);
          user.password = hashed;
        }
    
        await user.save();
        const updatedUser = await User.findById(user._id)
          .populate("locationId", "locationName")
          .select("-password");
    
        res.status(200).json({
          success: true,
          message: "User updated successfully",
          data: updatedUser,
        });
      } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Server error" });
      }
};

const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        // Only allow admin to delete users
        if (req.user.role !== "admin") {
            return res.status(403).json({ success: false, message: "Not authorized" });
        }
        // Prevent deleting own account
        if (req.user.id === id) {
            return res.status(403).json({ success: false, message: "Cannot delete own account" });
        }

        const targetUser = await User.findById(id);
        if (!targetUser) {
        return res.status(404).json({ success: false, message: "User not found" });
        }

        // Prevent deleting another admin
        if (targetUser.role === "admin") {
        return res.status(403).json({ success: false, message: "Cannot delete another admin" });
        }


        await User.findByIdAndDelete(id);

        res.status(200).json({ success: true, message: "User deleted successfully" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

export {getUsers, getUserbyId, createUser, updateUser, deleteUser};