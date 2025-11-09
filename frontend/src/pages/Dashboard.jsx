import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { motion } from "framer-motion";
import { FaBox, FaMoneyBillWave, FaChartLine } from "react-icons/fa";
import authHeaders from "../utils/authHeaders";

const Dashboard = () => {
  const [products, setProducts] = useState([]);
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lowStockThreshold, setLowStockThreshold] = useState(10);
  const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

  const apiRequest = async (callback) => {
    try {
      return await callback();
    } catch (err) {
      if (err.response?.status === 401) {
        alert("Session expired. Logging out...");
        sessionStorage.clear();
        window.location.href = "/login";
      } else {
        console.error(err.response?.data ?? err.message);
      }
    }
  };

  // 🧩 Fetch products + sales transactions
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [productRes, transactionRes] = await Promise.all([
          apiRequest(() =>
            axios.get(`${API_BASE_URL}/api/product`, authHeaders())
          ),
          apiRequest(() =>
            axios.get(`${API_BASE_URL}/api/transaction?type=sale`, authHeaders())
          ),
        ]);

        console.log("📦 Product Response:", productRes?.data);
        console.log("💰 Transaction Response:", transactionRes?.data);

        // ✅ Backend returns {success: true, data: [...]}
        const productsData = productRes?.data?.data ?? productRes?.data?.products ?? [];
        const salesData = transactionRes?.data?.data ?? [];

        console.log("📦 Products loaded:", productsData.length);
        console.log("💰 Sales loaded:", salesData.length);

        setProducts(productsData);
        setSales(salesData);
      } catch (err) {
        console.error("❌ Dashboard fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [API_BASE_URL]);

  // === Derived Stats ===
  const totalProducts = products.length;
  const totalStocks = products.reduce((sum, p) => sum + (p.stock || 0), 0);
  const outOfStock = products.filter((p) => (p.stock || 0) <= 0).length;
  const totalInventoryValue = products.reduce(
    (sum, p) => sum + (p.sellingPrice || 0) * (p.stock || 0),
    0
  );

  // ✅ Filter only approved sales
  const approvedSales = sales.filter((s) => s.status === "approved");

  // 🧾 Compute total sales from approved sale transactions only
  const totalSales = approvedSales.reduce((sum, s) => {
    const transactionTotal = s.products?.reduce((tSum, p) => {
      const price = p.discountedPrice || p.unitPrice || 0;
      return tSum + price * (p.quantity || 0);
    }, 0);
    return sum + transactionTotal;
  }, 0);

  // 📦 Top 10 Low-stock list
  const lowStockProducts = [...products]
    .filter((p) => (p.stock || 0) <= lowStockThreshold)
    .sort((a, b) => a.stock - b.stock)
    .slice(0, 10);

  // 🔝 Top-selling items (aggregate across approved sale transactions only)
  const topSelling = Object.values(
    approvedSales.reduce((acc, sale) => {
      sale.products?.forEach((item) => {
        const name = item.product?.productName || "Unknown";
        if (!acc[name]) acc[name] = { name, qty: 0 };
        acc[name].qty += item.quantity || 0;
      });
      return acc;
    }, {})
  )
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 10);

  return (
    <motion.div
      className="p-6 bg-gray-50 min-h-screen"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Dashboard</h1>

      {loading ? (
        <p className="text-center text-gray-500">Loading dashboard data...</p>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 mb-6">
            {[
              { title: "Total Products", value: totalProducts, icon: <FaBox className="text-green-600 text-xl" />, route: "/inventory" },
              { title: "Total Stocks", value: totalStocks.toLocaleString(), icon: <FaBox className="text-blue-600 text-xl" />, route: "/inventory" },
              { title: "Out of Stock", value: outOfStock, icon: <FaBox className="text-red-500 text-xl" />, route: "/inventory" },
              { title: "Inventory Value", value: `₱${Number(totalInventoryValue).toLocaleString()}`, icon: <FaMoneyBillWave className="text-yellow-600 text-xl" />, route: "/inventory" },
              { title: "Total Sales", value: `₱${Number(totalSales).toLocaleString()}`, icon: <FaChartLine className="text-purple-600 text-xl" />, route: "/transactions?type=sale" },
            ].map((card, idx) => (
              <motion.div
                key={idx}
                className={`bg-white border border-gray-200 rounded-xl shadow-sm p-5 hover:shadow-md transition cursor-not-allowed`}
                whileHover={{ scale: 1.02 }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">{card.title}</p>
                    <p className="mt-2 text-2xl font-semibold text-gray-800">
                      {card.value}
                    </p>
                  </div>
                  {card.icon}
                </div>
              </motion.div>
            ))}
          </div>

          {/* Top Saleable Items */}
          <motion.div
            className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 mb-6 hover:shadow-md transition"
            whileHover={{ scale: 1.01 }}
          >
            <h2 className="text-lg font-semibold text-gray-700 mb-4">
              Top 10 Saleable Items
            </h2>
            {topSelling.length === 0 ? (
              <p className="text-gray-500">No sales data available.</p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={topSelling}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ddd" />
                  <XAxis dataKey="name" stroke="#555" />
                  <YAxis stroke="#555" />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="qty" fill="#16a34a" name="Quantity Sold" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </motion.div>

          {/* Top 10 Low Inventory */}
          <motion.div
            className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 hover:shadow-md transition cursor-not-allowed"
            whileHover={{ scale: 1.01 }}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-700">
                Top 10 Low Inventory
              </h2>
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600">Threshold:</label>
                <input
                  type="number"
                  value={lowStockThreshold}
                  onChange={(e) => setLowStockThreshold(Number(e.target.value))}
                  className="w-16 text-center border border-gray-300 rounded p-1 text-gray-700 focus:ring-2 focus:ring-green-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="overflow-y-auto max-h-64">
              {lowStockProducts.length === 0 ? (
                <p className="text-gray-500">No low stock items found.</p>
              ) : (
                <table className="w-full text-sm text-left">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="p-2 text-gray-600 font-medium">
                        Product Name
                      </th>
                      <th className="p-2 text-gray-600 font-medium">Stock</th>
                      <th className="p-2 text-gray-600 font-medium">Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lowStockProducts.map((p) => (
                      <tr
                        key={p._id}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="p-2 text-gray-800">{p.productName}</td>
                        <td className="p-2 text-gray-800">{p.stock}</td>
                        <td className="p-2 text-gray-800">
                          ₱{Number(p.sellingPrice).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </motion.div>
        </>
      )}
    </motion.div>
  );
}

export default Dashboard;
