import mongoose from "mongoose";
import LocationModel from "./Location.js"


const userSchema = new mongoose.Schema({
    name: {type: String, required: true},
    email: {type: String, required: true, unique: true},
    password: {type: String, required: true},
    address: {type: String, required: true},
    role: {type: String, enum: ["admin", "user"], default: "user"},
    locationId: {type: mongoose.Schema.Types.ObjectId, ref: "Location"},
    image: { type: String, trim: true, default: "", validator: function (v)  {
        // Allow empty or valid URL (starting with http:// or https://)
        return !v || /^https?:\/\/.+/.test(v);
      },
      message: "Invalid image URL format",
    },
},
{timestamps: true}
);

userSchema.pre("save", async function(next) {
    if (this.role === "admin" && !this.locationId) {
        const hq = await LocationModel.findOne({locationName : "HQ"});
        if (hq) {
            this.locationId = hq._id;
        }
    }
    next();
})
const User = mongoose.model("User", userSchema);
export default User;