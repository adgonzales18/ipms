import React, { useState } from "react";
import { motion } from "framer-motion";
import { FaBox, FaTags, FaMapMarkerAlt, FaBuilding } from "react-icons/fa";
import ProductsTab from "../components/ProductTab.jsx";
import CompanyTab from "../components/CompanyTab.jsx";
import LocationTab from "../components/LocationTab.jsx";
import CategoryTab from "../components/CategoryTab.jsx";
import authHeaders from "../utils/authHeaders";

const DataManagement = () => {
    const [activeTab, setActiveTab] = useState("products");

    const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

    const apiRequest = async(callback) => {
        try { return await callback(); } 
        catch (error) {
            if (error.response?.status === 401) {
                alert("Session expired. Logging out...");
                sessionStorage.clear();
                window.location.ref = "/login";
            } else console.error(error.response?.data ?? error.message)
        }
    }
    
  return (
    <motion.div
      className="p-6 h-[calc(100vh-4rem)] flex flex-col rounded-sm bg-gray-50"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
    >
        <div className="p-6 min-h-screen w-full max-w-full bg-gray-50">
            <h1 className="text-2xl font-bold mb-6">Data Management</h1>
            <div className="flex flex-wrap gap-3 mb-6">
                    {[
                        { key: "products", label: "Products", icon: <FaBox /> },
                        { key: "categories", label: "Categories", icon: <FaTags /> },
                        { key: "locations", label: "Locations", icon: <FaMapMarkerAlt /> },
                        { key: "company", label: "Company", icon: <FaBuilding /> },
                    ].map(({ key, label, icon }) => (
                    <button
                    key={key}
                    onClick={() => setActiveTab(key)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200
                        ${
                        activeTab === key
                            ? "bg-blue-800 text-white shadow-md"
                            : "bg-white border border-gray-300 text-gray-800 hover:bg-gray-50"
                        }`}
                    >
                    {icon}
                    <span>{label}</span>
                    </button>
                ))}
            </div>
            <div className="w-full max-w-full">
            <div className={`w-full ${activeTab === "products" ? "" : "hidden"}`}>
                <ProductsTab
                API_BASE_URL={API_BASE_URL}
                authHeaders={authHeaders}
                apiRequest={apiRequest}
                />
            </div>

            <div className={`w-full ${activeTab === "categories" ? "" : "hidden"}`}>
                <CategoryTab
                API_BASE_URL={API_BASE_URL}
                authHeaders={authHeaders}
                apiRequest={apiRequest}
                />
            </div>

            <div className={`w-full ${activeTab === "locations" ? "" : "hidden"}`}>
                <LocationTab
                API_BASE_URL={API_BASE_URL}
                authHeaders={authHeaders}
                apiRequest={apiRequest}
                />
            </div>

            <div className={`w-full ${activeTab === "company" ? "" : "hidden"}`}>
                <CompanyTab
                API_BASE_URL={API_BASE_URL}
                authHeaders={authHeaders}
                apiRequest={apiRequest}
                />
            </div>
            </div>
        </div>
    </motion.div>
  );
};

export default DataManagement