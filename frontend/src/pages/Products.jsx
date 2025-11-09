
import { useState, useEffect } from "react";
import axios from "axios";
import { motion } from "framer-motion";
import { FaTrash, FaEdit, FaFileExport } from "react-icons/fa";
import DataTable from "../components/DataTable";
import authHeaders from "../utils/authHeaders";

function Products() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [locations, setLocations] = useState([]);
  const [transactions, setTransactions] = useState([]);

  const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

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

  // Custom search function for DataTable
  const handleSearch = (row, searchTerm) => {
    return (
      (row.itemCode || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (row.productName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (row.productDescription || "").toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  // Prepare data with computed values
  const tableData = products.map((p) => {
    const locId = p.locationId?._id || p.locationId;
    const pending = getPendingAdjustment(p, locId);
    const available = getAvailableStock(p, locId);

    return {
      ...p,
      _pending: pending,
      _available: available,
      _locationName: p.locationId?.locationName || p.locationName || "N/A",
      _categoryName: p.categoryId?.categoryName || "N/A",
      categoryId: p.categoryId?._id || p.categoryId,
      locationId: locId,
    };
  });

  // Column configuration for DataTable
  const columns = [
    {
      key: "itemCode",
      label: "Item Code",
      className: "px-6 py-4 font-medium text-gray-900 whitespace-nowrap",
      render: (row) => row.itemCode || "-",
    },
    {
      key: "productName",
      label: "Name",
      sortable: true,
      sortType: "alpha",
    },
    {
      key: "productDescription",
      label: "Description",
      render: (row) => row.productDescription || "-",
    },
    {
      key: "unitMeasure",
      label: "Unit Measure",
      render: (row) => row.unitMeasure || "-",
    },
    {
      key: "sellingPrice",
      label: "Selling Price (₱)",
      sortable: true,
      sortType: "numeric",
      render: (row) =>
        typeof row.sellingPrice !== "undefined"
          ? formatCurrency(row.sellingPrice)
          : "-",
    },
    {
      key: "stock",
      label: "On Hand",
      render: (row) => row.stock ?? 0,
    },
    {
      key: "_pending",
      label: "Pending",
      render: (row) => (row._pending >= 0 ? `+${row._pending}` : row._pending),
    },
    {
      key: "_available",
      label: "Available",
      sortable: true,
      sortType: "numeric",
      className: "px-6 py-4 font-semibold text-gray-800",
    },
    {
      key: "locationId",
      label: "Location",
      filter: {
        type: "select",
        options: locations.map((l) => ({
          value: l._id,
          label: l.locationName,
        })),
      },
      render: (row) => row._locationName,
    },
    {
      key: "categoryId",
      label: "Category",
      filter: {
        type: "select",
        options: categories.map((c) => ({
          value: c._id,
          label: c.categoryName,
        })),
      },
      render: (row) => row._categoryName,
    },
  ];

  // Action handlers
  const handleDelete = (selectedRows) => {
    console.log("Delete selected rows:", selectedRows);
    // TODO: Implement delete functionality
    alert(`Delete ${selectedRows.length} product(s)?`);
  };

  const handleEdit = (selectedRows) => {
    console.log("Edit selected rows:", selectedRows);
    // TODO: Implement edit functionality
    if (selectedRows.length === 1) {
      alert(`Edit product: ${selectedRows[0].productName}`);
    } else {
      alert("Please select only one product to edit");
    }
  };

  const handleExport = (selectedRows) => {
    console.log("Export selected rows:", selectedRows);
    // TODO: Implement export functionality
    alert(`Export ${selectedRows.length} product(s) to CSV/Excel`);
  };

  // Define actions for selected rows
  const actions = [
    {
      label: "Edit",
      icon: <FaEdit />,
      onClick: handleEdit,
      variant: "primary",
    },
    {
      label: "Delete",
      icon: <FaTrash />,
      onClick: handleDelete,
      variant: "danger",
    },
    {
      label: "Export",
      icon: <FaFileExport />,
      onClick: handleExport,
      variant: "success",
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
    >
      <DataTable
        title="Products"
        data={tableData}
        columns={columns}
        searchPlaceholder="Search by code, name, or description"
        onSearch={handleSearch}
        selectable={true}
        actions={actions}
      />
    </motion.div>
  );
}

export default Products;

