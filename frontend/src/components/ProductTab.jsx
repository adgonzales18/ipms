
import React, { useState, useEffect } from "react";
import axios from "axios";
import { motion } from "framer-motion";
import { FaTrash, FaEdit, FaFileExport, FaPlus, FaFileImport } from "react-icons/fa";
import DataTable from "./DataTable";
import PopoutForm from "./PopoutForm";
import ConfirmDialog from "./ConfirmDialog";


const ProductTab = ({ API_BASE_URL, authHeaders, apiRequest }) => {
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [locations, setLocations] = useState([]);
    const [transactions, setTransactions] = useState([]);
    const [deleteProductIds, setDeleteProductIds] = useState([]);
    const [editingProduct, setEditingProduct] = useState(null);
    const [showAdd, setShowAdd] = useState(false);
    const [showImport, setShowImport] = useState(false);
    const [importFile, setImportFile] = useState(null);
    const [loading, setLoading] = useState(false);

    const formatCurrency = (value) =>
        Number(value || 0).toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });

    

    const fetchAll = async () => {
        await apiRequest(async () => {
            const [catRes, locRes, prodRes, txRes] = await Promise.all([
                axios.get(`${API_BASE_URL}/api/category`, authHeaders()),
                axios.get(`${API_BASE_URL}/api/location`, authHeaders()),
                axios.get(`${API_BASE_URL}/api/product`, authHeaders()),
                axios.get(`${API_BASE_URL}/api/transaction?status=pending`, authHeaders()),
            ]);

            setCategories(catRes.data.data || catRes.data.categories || []);
            setLocations(locRes.data.data || locRes.data.locations || []);  
            setProducts(prodRes.data.data || prodRes.data.products || []);
            setTransactions(txRes.data.data || txRes.data.transactions || []);              
        });
    };
    useEffect(() => {  fetchAll() }, []);

    const confirmDelete = async () => {
        if (!deleteProductIds.length) return;
        setLoading(true);
        await apiRequest(async () => {
          // Delete all selected products
          await Promise.all(
            deleteProductIds.map((id) =>
              axios.delete(`${API_BASE_URL}/api/product/${id}`, authHeaders())
            )
          );
          await fetchAll();
        });
        setLoading(false);
        setDeleteProductIds([]);
      };

      const handleAddProduct = async (data) => {
        setLoading(true);
        await apiRequest(async () => {
          await axios.post(`${API_BASE_URL}/api/product`, data, authHeaders());
          await fetchAll();
        });
        setShowAdd(false);
        setLoading(false);
      };

      const handleEditProduct = async (data) => {
        setLoading(true);
        await apiRequest(async () => {
          await axios.put(`${API_BASE_URL}/api/product/${editingProduct._id}`, data, authHeaders());
          await fetchAll();
        });
        setEditingProduct(null);
        setLoading(false);
      };

      const handleImport = async () => {
        if (!importFile) {
          alert("Please select a file to import");
          return;
        }

        setLoading(true);
        const reader = new FileReader();

        reader.onload = async (e) => {
          try {
            const text = e.target.result;
            const lines = text.split("\n").filter((line) => line.trim());

            if (lines.length < 2) {
              alert("CSV file is empty or invalid");
              setLoading(false);
              return;
            }

            // Parse CSV
            const headers = lines[0].split(",").map((h) => h.trim().replace(/"/g, ""));
            const products = [];

            for (let i = 1; i < lines.length; i++) {
              const values = lines[i].split(",").map((v) => v.trim().replace(/"/g, ""));

              // Map CSV columns to product fields
              const product = {
                itemCode: values[0] || "",
                productName: values[1] || "",
                productDescription: values[2] || "",
                unitMeasure: values[3] || "",
                costPrice: parseFloat(values[4]) || 0,
                sellingPrice: parseFloat(values[5]) || 0,
                stock: parseInt(values[6]) || 0,
                locationId: values[7] || "", // Location name - needs to be converted to ID
                categoryId: values[8] || "", // Category name - needs to be converted to ID
              };

              // Find location ID by name
              const location = locations.find((l) => l.locationName === product.locationId);
              if (location) {
                product.locationId = location._id;
              } else {
                console.warn(`Location not found: ${product.locationId}`);
                continue;
              }

              // Find category ID by name
              const category = categories.find((c) => c.categoryName === product.categoryId);
              if (category) {
                product.categoryId = category._id;
              } else {
                console.warn(`Category not found: ${product.categoryId}`);
                continue;
              }

              products.push(product);
            }

            if (products.length === 0) {
              alert("No valid products found in CSV");
              setLoading(false);
              return;
            }

            // Import products
            await apiRequest(async () => {
              await Promise.all(
                products.map((product) =>
                  axios.post(`${API_BASE_URL}/api/product`, product, authHeaders())
                )
              );
              await fetchAll();
            });

            alert(`Successfully imported ${products.length} product(s)`);
            setShowImport(false);
            setImportFile(null);
          } catch (error) {
            console.error("Import error:", error);
            alert("Error importing products. Please check the CSV format.");
          }
          setLoading(false);
        };

        reader.readAsText(importFile);
      };


    const getTxItems = (tx) => tx.products || tx.items || tx.lineItems || [];
    const getTxLocationIds = (tx) => {
        const from = tx.fromLocation?._id;
        const to = tx.toLocation?._id;
        const single = tx.locationId?._id;
        return { from, to, single };
    };

    const getPendingAdjustment = (product, locationId) => {
        if (!product || !locationId) return 0;
        const pid = String(product._id);
        let pending = 0;
    
        transactions.forEach((tx) => {
          const items = getTxItems(tx);
          if (!items.length) return;
          const { from, to, single } = getTxLocationIds(tx);
    
          items.forEach((item) => {
            const itemProdId =
              (typeof item.product === "object" ? item.product?._id : item.product) ||
              (typeof item.productId === "object" ? item.productId?._id : item.productId) ||
              item.product_id;
    
            if (!itemProdId || String(itemProdId) !== pid) return;
    
            const qty = Number(item.quantity || item.qty || item.amount || 0);
            const tType = (tx.type || "").toLowerCase();
    
            if (["sale", "sales", "outbound"].includes(tType)) {
              const loc = single || from;
              if (loc && String(loc) === String(locationId)) pending -= qty;
            } else if (["inbound"].includes(tType)) {
              const loc = single || to;
              if (loc && String(loc) === String(locationId)) pending += qty;
            } else if (tType === "transfer") {
              if (from && String(from) === String(locationId)) pending -= qty;
              if (to && String(to) === String(locationId)) pending += qty;
            }
          });
        });

        return pending;
      };

      const getAvailableStock = (product, locationId) => {
        const pending = getPendingAdjustment(product, locationId);
        return (Number(product.stock || 0)) + pending;
      };

      const handleSearch = (row, searchTerm) => {
        return (
          (row.itemCode || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
          (row.productName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
          (row.productDescription || "").toLowerCase().includes(searchTerm.toLowerCase())
        );
      };
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
            key: "costPrice",
            label: "Cost Price (₱)",
            sortable: true,
            sortType: "numeric",
            render: (row) =>
              typeof row.costPrice !== "undefined"
                ? formatCurrency(row.costPrice)
                : "-",
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
          sortable: true,
          sortType: "numeric",
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
        const ids = selectedRows.map((row) => row._id);
        setDeleteProductIds(ids);
      };

      const handleEdit = (selectedRows) => {
        if (selectedRows.length === 1) {
          setEditingProduct(selectedRows[0]);
        } else {
          alert("Please select only one product to edit");
        }
      };

      const handleExport = (selectedRows) => {
        // Convert to CSV
        const headers = ["Item Code", "Name", "Description", "Unit", "Cost Price", "Selling Price", "Stock", "Location", "Category"];
        const csvData = selectedRows.map((row) => [
          row.itemCode || "",
          row.productName || "",
          row.productDescription || "",
          row.unitMeasure || "",
          row.costPrice || 0,
          row.sellingPrice || 0,
          row.stock || 0,
          row._locationName || "",
          row._categoryName || "",
        ]);

        const csvContent = [
          headers.join(","),
          ...csvData.map((row) => row.map((cell) => `"${cell}"`).join(","))
        ].join("\n");

        // Download CSV
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `products_export_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = "hidden";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      };

      const downloadTemplate = () => {
        const headers = ["Item Code", "Name", "Description", "Unit", "Cost Price", "Selling Price", "Stock", "Location", "Category"];
        const sampleData = [
          ["PROD001", "Sample Product", "Sample description", "pcs", "100.00", "150.00", "10", "Main Warehouse", "Electronics"],
          ["PROD002", "Another Product", "Another description", "box", "50.00", "75.00", "20", "Branch 1", "Office Supplies"],
        ];

        const csvContent = [
          headers.join(","),
          ...sampleData.map((row) => row.map((cell) => `"${cell}"`).join(","))
        ].join("\n");

        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", "product_import_template.csv");
        link.style.visibility = "hidden";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
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
          headerActions={
            <>
              <button
                onClick={() => setShowImport(true)}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md font-medium transition-colors duration-200 flex items-center gap-2 shadow-md"
              >
                <FaFileImport />
                <span>Import</span>
              </button>
              <button
                onClick={() => setShowAdd(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium transition-colors duration-200 flex items-center gap-2 shadow-md"
              >
                <FaPlus />
                <span>Add Product</span>
              </button>
            </>
          }
        />
        
        {/* Add Product Form */}
        {showAdd && (
          <PopoutForm
            title="Add Product"
            isOpen={showAdd}
            onClose={() => setShowAdd(false)}
            onSubmit={handleAddProduct}
            loading={loading}
            mode="form"
            fields={[
              { name: "itemCode", label: "Item Code", required: true },
              { name: "productName", label: "Name", required: true },
              { name: "productDescription", label: "Description" },
              { name: "unitMeasure", label: "Unit of Measure" },
              { name: "costPrice", label: "Cost Price", type: "number", required: true },
              { name: "sellingPrice", label: "Selling Price", type: "number", required: true },
              { name: "stock", label: "Initial Stock", type: "number", defaultValue: 0 },
              {
                name: "locationId",
                label: "Location",
                type: "select",
                required: true,
                options: locations.map((l) => ({ value: l._id, label: l.locationName }))
              },
              {
                name: "categoryId",
                label: "Category",
                type: "select",
                required: true,
                options: categories.map((c) => ({ value: c._id, label: c.categoryName }))
              },
            ]}
          />
        )}

        {/* Edit Product Form */}
        {editingProduct && (
          <PopoutForm
            title="Edit Product"
            isOpen={!!editingProduct}
            onClose={() => setEditingProduct(null)}
            onSubmit={handleEditProduct}
            loading={loading}
            mode="form"
            initialData={editingProduct}
            fields={[
              { name: "itemCode", label: "Item Code", required: true },
              { name: "productName", label: "Name", required: true },
              { name: "productDescription", label: "Description" },
              { name: "unitMeasure", label: "Unit of Measure" },
              { name: "costPrice", label: "Cost Price", type: "number", required: true },
              { name: "sellingPrice", label: "Selling Price", type: "number", required: true },
              {
                name: "locationId",
                label: "Location",
                type: "select",
                required: true,
                options: locations.map((l) => ({ value: l._id, label: l.locationName }))
              },
              {
                name: "categoryId",
                label: "Category",
                type: "select",
                required: true,
                options: categories.map((c) => ({ value: c._id, label: c.categoryName }))
              },
            ]}
          />
        )}

        {/* Delete Confirmation Dialog */}
        {deleteProductIds.length > 0 && (
          <ConfirmDialog
            title="Delete Product(s)"
            message={`Are you sure you want to delete ${deleteProductIds.length} product(s)? This action cannot be undone.`}
            onConfirm={confirmDelete}
            onCancel={() => setDeleteProductIds([])}
            loading={loading}
          />
        )}

        {/* Import Dialog */}
        {showImport && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
              <h2 className="text-xl font-bold mb-4">Import Products from CSV</h2>

              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">
                  Upload a CSV file with the following columns:
                </p>
                <div className="bg-gray-50 p-3 rounded text-xs font-mono mb-2">
                  Item Code, Name, Description, Unit, Cost Price, Selling Price, Stock, Location, Category
                </div>
                <button
                  onClick={downloadTemplate}
                  className="text-sm text-blue-600 hover:text-blue-700 underline"
                >
                  Download CSV Template
                </button>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select CSV File
                </label>
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => setImportFile(e.target.files[0])}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
              </div>

              {importFile && (
                <div className="mb-4 p-2 bg-blue-50 rounded text-sm">
                  <strong>Selected:</strong> {importFile.name}
                </div>
              )}

              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => {
                    setShowImport(false);
                    setImportFile(null);
                  }}
                  disabled={loading}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleImport}
                  disabled={loading || !importFile}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Importing...</span>
                    </>
                  ) : (
                    <>
                      <FaFileImport />
                      <span>Import</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </motion.div>
      )
    
}

export default ProductTab;
