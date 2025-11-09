import { useEffect, useState } from "react";
import axios from "axios";
import { UserPlus, Edit3, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import authHeaders from "../utils/authHeaders";
import Alert from "../components/Alert";
import ConfirmDialog from "../components/ConfirmDialog";

const Users = () => {
  const [users, setUsers] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [alert, setAlert] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(null);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    role: "viewer",
    address: "",
    locationId: "",
    password: "",
  });

  const currentUser = JSON.parse(sessionStorage.getItem("user"));
  const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

  // Fetch users
  const fetchUsers = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/users`, authHeaders());
      const data =
        Array.isArray(res.data?.data)
          ? res.data.data
          : Array.isArray(res.data?.users)
          ? res.data.users
          : Array.isArray(res.data)
          ? res.data
          : [];
      setUsers(data);
    } catch (err) {
      console.error("Error fetching users:", err);
      setError("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  // Fetch locations
  const fetchLocations = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/location`, authHeaders());
      setLocations(res.data.data || res.data.locations || []);
    } catch (err) {
      console.error("Error fetching locations:", err);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchLocations();
  }, []);

  // Edit user
  const handleEdit = (user) => {
    setEditingUser(user);
    setFormData({
      name: user.name || "",
      email: user.email || "",
      role: user.role || "viewer",
      address: user.address || "",
      locationId: user.locationId?._id || "",
      password: "",
    });
    setShowModal(true);
  };

  // Add user
  const handleAdd = () => {
    setEditingUser(null);
    setFormData({
      name: "",
      email: "",
      role: "viewer",
      address: "",
      locationId: "",
      password: "",
    });
    setShowModal(true);
  };

  // Delete user
  const handleDelete = (id) => {
    setConfirmDialog({
      title: "Delete User",
      message: "Are you sure you want to delete this user? This action cannot be undone.",
      onConfirm: async () => {
        try {
          await axios.delete(`${API_BASE_URL}/api/users/${id}`, authHeaders());
          setConfirmDialog(null);
          setAlert({ type: "success", message: "User deleted successfully!" });
          fetchUsers();
        } catch (err) {
          console.error("Delete failed:", err);
          setConfirmDialog(null);
          setAlert({ type: "error", message: err.response?.data?.message || "Error deleting user" });
        }
      },
      onCancel: () => setConfirmDialog(null),
    });
  };

  // Save user
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingUser && editingUser.role === "admin" && formData.role !== "admin") {
        alert("You cannot change another admin’s role.");
        return;
      }

      if (editingUser) {
        await axios.patch(
          `${API_BASE_URL}/api/users/${editingUser._id}`,
          formData,
          authHeaders()
        );
        setAlert({ type: "success", message: "User updated successfully!" });
      } else {
        await axios.post(`${API_BASE_URL}/api/users`, formData, authHeaders());
        setAlert({ type: "success", message: "User created successfully!" });
      }

      setShowModal(false);
      fetchUsers();
    } catch (err) {
      console.error("Save failed:", err);
      setAlert({
        type: "error",
        message: err.response?.data?.message || "Error saving user. Make sure all fields are correct."
      });
    }
  };

  // Loading & error
  if (loading)
    return <div className="p-6 text-gray-500 animate-pulse">Loading users...</div>;
  if (error) return <div className="p-6 text-red-500">{error}</div>;

  return (
    <motion.div
    className="p-6 h-[calc(100vh-4rem)] flex flex-col rounded-sm bg-gray-50"
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -10 }}
    transition={{ duration: 0.3, ease: "easeInOut" }}
    >
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-gray-800">User Management</h1>
        {currentUser?.role === "admin" && (
          <button
            onClick={handleAdd}
            className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
          >
            <UserPlus size={18} /> Add User
          </button>
        )}
      </div>

      {/* User Grid */}
      {!users.length ? (
        <div className="text-gray-500 text-center mt-10">No users found</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {users.map((user) => (
            <div
              key={user._id}
              className="bg-white shadow-sm border border-gray-200 rounded-xl p-5 hover:shadow-md transition flex flex-col justify-between"
            >
              <div>
                <img
                  src={user.image || "https://via.placeholder.com/100?text=User"}
                  alt={user.name}
                  className="w-20 h-20 rounded-full mx-auto mb-3 object-cover border border-gray-300"
                />
                <h2 className="text-lg font-semibold text-center text-gray-800">
                  {user.name || "Unnamed User"}
                </h2>
                <p className="text-sm text-gray-600 text-center">{user.email}</p>
                <div className="mt-3 text-sm text-gray-500 space-y-1 text-center">
                  <p>
                    <span className="font-medium text-gray-700">Role:</span>{" "}
                    {user.role || "N/A"}
                  </p>
                  <p>
                    <span className="font-medium text-gray-700">Address:</span>{" "}
                    {user.address || "N/A"}
                  </p>
                  <p>
                    <span className="font-medium text-gray-700">Location:</span>{" "}
                    {user.locationId?.locationName || "N/A"}
                  </p>
                </div>
              </div>

              {currentUser?.role === "admin" && (
                <div className="mt-5 flex justify-center gap-3">
                  <button
                    onClick={() => handleEdit(user)}
                    className="flex items-center gap-1 bg-blue-600 text-white px-3 py-1.5 rounded-md hover:bg-blue-700 transition"
                  >
                    <Edit3 size={16} /> Edit
                  </button>
                  {user.role === "viewer" && (
                    <button
                      onClick={() => handleDelete(user._id)}
                      className="flex items-center gap-1 bg-red-600 text-white px-3 py-1.5 rounded-md hover:bg-red-700 transition"
                    >
                      <Trash2 size={16} /> Delete
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-blue-900 bg-opacity-50">
          {/* Modal Content */}
          <div className="relative bg-white rounded-2xl shadow-xl w-[400px] max-w-[90vw] p-6 z-10">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-xl font-semibold text-gray-800">
                {editingUser ? "Edit User" : "Add New User"}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Full Name
                </label>
                <input
                  type="text"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Email
                </label>
                <input
                  type="email"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  required
                />
              </div>

              {/* Password */}
              {!editingUser && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Temporary Password
                  </label>
                  <input
                    type="password"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    placeholder="Set a temporary password"
                    required
                  />
                </div>
              )}

              {/* Address */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Address
                </label>
                <input
                  type="text"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                  value={formData.address}
                  onChange={(e) =>
                    setFormData({ ...formData, address: e.target.value })
                  }
                />
              </div>

              {/* Role */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Role
                </label>
                <select
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                  value={formData.role}
                  onChange={(e) =>
                    setFormData({ ...formData, role: e.target.value })
                  }
                  disabled={!!editingUser}
                >
                  <option value="viewer">Viewer</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              {/* Location */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Location
                </label>
                <select
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                  value={formData.locationId}
                  onChange={(e) =>
                    setFormData({ ...formData, locationId: e.target.value })
                  }
                >
                  <option value="">Select location</option>
                  {locations.map((loc) => (
                    <option key={loc._id} value={loc._id}>
                      {loc.locationName}
                    </option>
                  ))}
                </select>
              </div>

              {/* Buttons */}
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
                >
                  {editingUser ? "Update" : "Create"}
                </button>
              </div>
            </form>
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

      {/* Confirm Dialog */}
      {confirmDialog && (
        <ConfirmDialog
          title={confirmDialog.title}
          message={confirmDialog.message}
          onConfirm={confirmDialog.onConfirm}
          onCancel={confirmDialog.onCancel}
          confirmText="Delete"
          type="danger"
        />
      )}
    </div>
    </motion.div>
  );
};

export default Users;
