import { useEffect, useState } from "react";
import axios from "axios";
import { motion } from "framer-motion";
import authHeaders from "../utils/authHeaders";
import Alert from "../components/Alert";

const Profile = () => {
  const [user, setUser] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    address: "",
    image: "",
    locationId: "",
  });
  const [locations, setLocations] = useState([]);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwords, setPasswords] = useState({ current: "", new: "", confirm: "" });
  const [alert, setAlert] = useState(null);

  const storedUser = JSON.parse(sessionStorage.getItem("user"));
  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

  // ✅ Fetch user details from backend
  useEffect(() => {
    const fetchProfile = async () => {
      if (!storedUser?._id && !storedUser?.id) return;

      try {
        const res = await axios.get(
          `${API_URL}/api/users/${storedUser._id || storedUser.id}`,
          authHeaders()
        );

        // Handle both API response styles
        const userData = res.data.data || res.data.user || res.data;
        setUser(userData);
        setFormData({
          name: userData.name || "",
          email: userData.email || "",
          address: userData.address || "",
          image: userData.image || "",
          locationId: userData.locationId?._id || "",
        });
      } catch (err) {
        console.error("Error fetching profile:", err);
      }
    };

    const fetchLocations = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/location`, authHeaders());
        setLocations(res.data.data || res.data.locations || []);
      } catch (err) {
        console.error("Error fetching locations:", err);
      }
    };

    fetchProfile();
    fetchLocations();
  }, [API_URL]);

  // ✅ Handle field edits
  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  // ✅ Save profile
  const handleSave = async () => {
    try {
      const res = await axios.patch(
        `${API_URL}/api/users/${user._id}`,
        formData,
        authHeaders()
      );
      const updatedUser = res.data.data || res.data.user || res.data;
      setUser(updatedUser);
      sessionStorage.setItem("user", JSON.stringify(updatedUser));
      setEditMode(false);
      setAlert({ type: "success", message: "Profile updated successfully!" });
    } catch (err) {
      console.error("Error updating profile:", err);
      setAlert({ type: "error", message: "Failed to update profile. Please try again." });
    }
  };

  // ✅ Handle password change
  const handlePasswordChange = async () => {
    if (passwords.new !== passwords.confirm) {
      setAlert({ type: "error", message: "New passwords do not match!" });
      return;
    }

    try {
      await axios.put(
        `${API_URL}/api/users/${user._id}/password`,
        { currentPassword: passwords.current, newPassword: passwords.new },
        authHeaders()
      );
      setAlert({ type: "success", message: "Password updated successfully!" });
      setShowPasswordModal(false);
      setPasswords({ current: "", new: "", confirm: "" });
    } catch (err) {
      console.error("Error changing password:", err);
      setAlert({ type: "error", message: err.response?.data?.message || "Failed to update password." });
    }
  };

  if (!user)
    return (
      <div className="flex justify-center items-center min-h-[60vh] text-gray-500">
        Loading profile...
      </div>
    );

  return (
    <motion.div
    className="p-6 h-[calc(100vh-4rem)] flex flex-col rounded-sm bg-gray-50"
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -10 }}
    transition={{ duration: 0.3, ease: "easeInOut" }}
    >
    <div className="max-w-2xl mx-auto bg-white p-8 shadow-lg rounded-2xl mt-10 border border-gray-100">
      <h2 className="text-3xl font-bold mb-6 text-gray-800 text-center">
        My Profile
      </h2>

      <div className="flex flex-col items-center text-center">
        <img
          src={user.image || "https://via.placeholder.com/120"}
          alt="Profile"
          className="w-28 h-28 rounded-full shadow-md object-cover mb-4 border-4 border-gray-200"
        />

        {editMode ? (
          <div className="w-full space-y-4">
            <div className="grid gap-3">
              <input
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Full name"
                className="border rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none"
              />
              <input
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Email"
                className="border rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none"
              />
              <input
                name="address"
                value={formData.address}
                onChange={handleChange}
                placeholder="Address"
                className="border rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none"
              />
              <input
                name="image"
                value={formData.image}
                onChange={handleChange}
                placeholder="Profile image URL"
                className="border rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none"
              />
              <select
                name="locationId"
                value={formData.locationId}
                onChange={handleChange}
                className="border rounded-lg p-3 bg-white focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="">Select Location</option>
                {locations.map((loc) => (
                  <option key={loc._id} value={loc._id}>
                    {loc.locationName}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => setEditMode(false)}
                className="px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-100 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700 transition"
              >
                Save Changes
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-lg font-semibold">{user.name}</p>
            <p className="text-gray-600">{user.email}</p>
            <p className="text-gray-600">
              {user.address || "No address provided"}
            </p>
            <p className="text-gray-600">
              Location: {user.locationId?.locationName || "Not set"}
            </p>
            <p className="text-sm text-gray-500 mt-1">Role: {user.role}</p>

            <div className="mt-5 flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => setEditMode(true)}
                className="bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700 transition"
              >
                Edit Profile
              </button>
              <button
                onClick={() => setShowPasswordModal(true)}
                className="bg-gray-500 text-white px-5 py-2 rounded-lg hover:bg-gray-600 transition"
              >
                Change Password
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ✅ Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-blue-900 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-2xl shadow-xl w-96 max-w-[90vw]">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-gray-800">
                Change Password
              </h3>
              <button
                onClick={() => setShowPasswordModal(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
              >
                ✕
              </button>
            </div>
            <div className="space-y-3">
              <input
                type="password"
                name="current"
                value={passwords.current}
                onChange={(e) =>
                  setPasswords({ ...passwords, current: e.target.value })
                }
                placeholder="Current password"
                className="border rounded-lg p-3 w-full focus:ring-2 focus:ring-blue-500 outline-none"
              />
              <input
                type="password"
                name="new"
                value={passwords.new}
                onChange={(e) =>
                  setPasswords({ ...passwords, new: e.target.value })
                }
                placeholder="New password"
                className="border rounded-lg p-3 w-full focus:ring-2 focus:ring-blue-500 outline-none"
              />
              <input
                type="password"
                name="confirm"
                value={passwords.confirm}
                onChange={(e) =>
                  setPasswords({ ...passwords, confirm: e.target.value })
                }
                placeholder="Confirm new password"
                className="border rounded-lg p-3 w-full focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div className="flex justify-end gap-3 mt-5">
              <button
                onClick={handlePasswordChange}
                className="bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700 transition"
              >
                Update Password
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Alert */}
      {alert && (
        <Alert
          type={alert.type}
          message={alert.message}
          onClose={() => setAlert(null)}
        />
      )}
    </div>
    </motion.div>
  );
};

export default Profile;
