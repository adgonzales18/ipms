import { useState, useEffect } from "react";
import axios from "axios";
import {
  FaSortAlphaDown,
  FaSortAlphaUp,
  FaSortNumericDown,
  FaSortNumericUp,
} from "react-icons/fa";
import { motion } from "framer-motion";


function Products() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [locations, setLocations] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({ category: "", location: "" });
  const [sortBy, setSortBy] = useState(null);

  const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

  const authHeaders = () => ({
    headers: { Authorization: `Bearer ${sessionStorage.getItem("pos-token")}` },
  });

  const formatCurrency = (value) =>
    Number(value || 0).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [catRes, locRes, prodRes, txRes] = await Promise.all([
          axios.get(`${API_BASE_URL}/api/category`, authHeaders()),
          axios.get(`${API_BASE_URL}/api/location`, authHeaders()),
          axios.get(`${API_BASE_URL}/api/product`, authHeaders()),
          axios.get(`${API_BASE_URL}/api/transaction?status=pending`, authHeaders()),
        ]);

        setCategories(catRes.data.data || catRes.data.categories || []);
        setLocations(locRes.data.data || locRes.data.locations || []);

        const prodData =
          Array.isArray(prodRes.data?.data)
            ? prodRes.data.data
            : Array.isArray(prodRes.data?.products)
            ? prodRes.data.products
            : Array.isArray(prodRes.data)
            ? prodRes.data
            : [];
        setProducts(prodData);

        const txData = Array.isArray(txRes.data?.data)
          ? txRes.data.data
          : Array.isArray(txRes.data)
          ? txRes.data
          : [];
        setTransactions(txData);
      } catch (err) {
        console.error("Error loading data:", err);
      }
    };
    fetchData();
  }, []);

  // Helpers
  const getTxItems = (tx) => tx.products || tx.items || tx.lineItems || [];

  const getTxLocationIds = (tx) => {
    const from =
      tx.fromLocation?._id ||
      tx.fromLocationId?._id ||
      tx.fromLocationId ||
      (typeof tx.fromLocation === "string" ? tx.fromLocation : undefined);
    const to =
      tx.toLocation?._id ||
      tx.toLocationId?._id ||
      tx.toLocationId ||
      (typeof tx.toLocation === "string" ? tx.toLocation : undefined);
    const single =
      tx.locationId?._id || tx.locationId || tx.location?._id || tx.location;
    return { from, to, single };
  };

  const getPendingAdjustment = (product, locationId) => {
    if (!product || !locationId) return 0;
    const pid = String(product._id || "");
    let pending = 0;

    transactions.forEach((tx) => {
      const items = getTxItems(tx);
      if (!items.length) return;

      const { from, to, single } = getTxLocationIds(tx);
      items.forEach((item) => {
        const itemProdId =
          (item.product && (typeof item.product === "object" ? item.product._id : item.product)) ||
          (item.productId && (typeof item.productId === "object" ? item.productId._id : item.productId)) ||
          item.product_id ||
          null;

        if (!itemProdId || String(itemProdId) !== pid) return;

        const qty = Number(item.quantity || item.qty || 0);
        const tType = (tx.type || "").toLowerCase();

        if (["sale", "sales", "outbound"].includes(tType)) {
          const locToCheck = single || from;
          if (locToCheck && String(locToCheck) === String(locationId)) pending -= qty;
        } else if (["inbound"].includes(tType)) {
          const locToCheck = single || to;
          if (locToCheck && String(locToCheck) === String(locationId)) pending += qty;
        } else if (tType === "transfer") {
          if (from && String(from) === String(locationId)) pending -= qty;
          if (to && String(to) === String(locationId)) pending += qty;
        }
      });
    });
    return pending;
  };

  const getAvailableStock = (product, locationId) =>
    Number(product.stock || 0) + getPendingAdjustment(product, locationId);

  // Filters & Sorting
  const filteredProducts = products
    .filter((p) =>
      search
        ? (p.itemCode || "").toLowerCase().includes(search.toLowerCase()) ||
          (p.productName || "").toLowerCase().includes(search.toLowerCase()) ||
          (p.productDescription || "").toLowerCase().includes(search.toLowerCase())
        : true
    )
    .filter((p) =>
      filters.category ? (p.categoryId?._id || p.categoryId) === filters.category : true
    )
    .filter((p) =>
      filters.location ? (p.locationId?._id || p.locationId) === filters.location : true
    )
    .sort((a, b) => {
      if (!sortBy) return 0;
      if (sortBy === "name-asc")
        return (a.productName || "").localeCompare(b.productName || "");
      if (sortBy === "name-desc")
        return (b.productName || "").localeCompare(a.productName || "");
      if (sortBy === "available-asc")
        return (
          getAvailableStock(a, a.locationId?._id || a.locationId) -
          getAvailableStock(b, b.locationId?._id || b.locationId)
        );
      if (sortBy === "available-desc")
        return (
          getAvailableStock(b, b.locationId?._id || b.locationId) -
          getAvailableStock(a, a.locationId?._id || a.locationId)
        );
      if (sortBy === "selling-asc")
        return (a.sellingPrice || 0) - (b.sellingPrice || 0);
      if (sortBy === "selling-desc")
        return (b.sellingPrice || 0) - (a.sellingPrice || 0);
      return 0;
    });

  return (
    <motion.div className="p-6 h-[calc(100vh-4rem)] flex flex-col rounded-sm bg-gray-50"
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -10 }}
    transition={{ duration: 0.3, ease: "easeInOut" }}>
    <div className="p-6 h-[calc(100vh-4rem)] flex flex-col rounded-sm bg-gray-50">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
        <h1 className="text-2xl font-bold mb-3 sm:mb-0">Products</h1>
        <input
          type="text"
          placeholder="Search by code, name, or description"
          className="border rounded-md p-2 w-full sm:w-64 focus:ring-2 focus:ring-green-500 focus:outline-none"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Table Container */}
      <div className="relative flex-1 overflow-hidden bg-white shadow-md sm:rounded-lg">
        <div className="overflow-y-auto h-full">
          <table className="w-full text-sm text-left text-gray-500">
            <thead className="text-xs uppercase bg-gray-50 text-gray-700 sticky top-0 z-10 shadow-sm">
              <tr>
                <th scope="col" className="px-6 py-3">Item Code</th>
                <th scope="col" className="px-6 py-3">
                  Name
                  <button
                    onClick={() => setSortBy(sortBy === "name-asc" ? "name-desc" : "name-asc")}
                    className="ml-2 inline-block text-gray-500 hover:text-gray-700"
                  >
                    {sortBy === "name-asc" ? <FaSortAlphaDown /> : <FaSortAlphaUp />}
                  </button>
                </th>
                <th scope="col" className="px-6 py-3">Description</th>
                <th scope="col" className="px-6 py-3">Unit Measure</th>
                <th scope="col" className="px-6 py-3">
                  Selling Price (₱)
                  <button
                    onClick={() =>
                      setSortBy(sortBy === "selling-asc" ? "selling-desc" : "selling-asc")
                    }
                    className="ml-2 inline-block text-gray-500 hover:text-gray-700"
                  >
                    {sortBy === "selling-asc" ? <FaSortNumericDown /> : <FaSortNumericUp />}
                  </button>
                </th>
                <th scope="col" className="px-6 py-3">On Hand</th>
                <th scope="col" className="px-6 py-3">Pending</th>
                <th scope="col" className="px-6 py-3">
                  Available
                  <button
                    onClick={() =>
                      setSortBy(
                        sortBy === "available-asc" ? "available-desc" : "available-asc"
                      )
                    }
                    className="ml-2 inline-block text-gray-500 hover:text-gray-700"
                  >
                    {sortBy === "available-asc" ? <FaSortNumericDown /> : <FaSortNumericUp />}
                  </button>
                </th>
                <th scope="col" className="px-6 py-3">
                  Location
                  <select
                    className="w-full mt-1 p-1 border rounded text-sm"
                    value={filters.location}
                    onChange={(e) => setFilters({ ...filters, location: e.target.value })}
                  >
                    <option value="">All</option>
                    {locations.map((l) => (
                      <option key={l._id} value={l._id}>
                        {l.locationName}
                      </option>
                    ))}
                  </select>
                </th>
                <th scope="col" className="px-6 py-3">
                  Category
                  <select
                    className="w-full mt-1 p-1 border rounded text-sm"
                    value={filters.category}
                    onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                  >
                    <option value="">All</option>
                    {categories.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.categoryName}
                      </option>
                    ))}
                  </select>
                </th>
              </tr>
            </thead>

            <tbody>
              {filteredProducts.map((p, i) => {
                const locId = p.locationId?._id || p.locationId;
                const pending = getPendingAdjustment(p, locId);
                const available = getAvailableStock(p, locId);

                return (
                  <tr
                    key={p._id || i}
                    className="bg-white border-b border-gray-200 hover:bg-gray-50"
                  >
                    <th
                      scope="row"
                      className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap"
                    >
                      {p.itemCode || "-"}
                    </th>
                    <td className="px-6 py-4">{p.productName}</td>
                    <td className="px-6 py-4">{p.productDescription || "-"}</td>
                    <td className="px-6 py-4">{p.unitMeasure || "-"}</td>
                    <td className="px-6 py-4">
                      {typeof p.sellingPrice !== "undefined"
                        ? formatCurrency(p.sellingPrice)
                        : "-"}
                    </td>
                    <td className="px-6 py-4">{p.stock ?? 0}</td>
                    <td className="px-6 py-4">
                      {pending >= 0 ? `+${pending}` : pending}
                    </td>
                    <td className="px-6 py-4 font-semibold text-gray-800">
                      {available}
                    </td>
                    <td className="px-6 py-4">
                      {p.locationId?.locationName || p.locationName || "N/A"}
                    </td>
                    <td className="px-6 py-4">
                      {p.categoryId?.categoryName || "N/A"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
    </motion.div>
  );
}

export default Products;

