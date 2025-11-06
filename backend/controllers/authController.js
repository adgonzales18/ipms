import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import nodeMailer from 'nodemailer';

const login = async (req, res) => {
    try {
        const {email, password} = req.body;

        const user = await User.findOne({email});
        if (!user) {
            return res.status(401).json({success: false, message: "Email address not found"});
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({success: false, message: "Invalid password"});
        }

        const token = jwt.sign({id: user._id}, process.env.JWT_SECRET, {expiresIn: '1d'});
        res.status(200).json({success: true, message:"Login successful", token, user: {id: user._id, name: user.name, email: user.email, role: user.role, locationId: user.locationId}});
    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({success: false, message: "Internal server error"});
    }
}

const forgotPassword = async (req, res) => {
    try {
        const {email} = req.body;

        const user = await User.findOne({email});
        if (!user) {
            return res.status(401).json({success: false, message: "Email address not found"});
        }

        const tempPassword = Math.random().toString(36).slice(-8);

        const hashedPassword = await bcrypt.hash(tempPassword, 10);
        user.password = hashedPassword;
        await user.save();

        const transporter = nodeMailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL,
                pass: process.env.PASSWORD,
            },
        });

        const mailOptions = {
            from: process.env.EMAIL,
            to: email,
            subject: 'Password Reset',
            text: `Your temporary password is: ${tempPassword}`,
        };
        await transporter.sendMail(mailOptions);
        return res.status(200).json({success: true, message: "Temporary password reset email sent"});
    } catch (error) {
        console.error("Forgot password error:", error);
        res.status(500).json({success: false, message: "Failed to send temporary password."});
    }
}


export {login, forgotPassword};