import React, { useState, useEffect } from "react";
import ReceiptPreview from "./ReceiptPreview";
import axios from "axios";
import {
  FaEdit,
  FaCheck,
  FaTimes,
  FaFileInvoice,
  FaSave,
  FaThumbsUp,
  FaThumbsDown,
  FaTrash,
  FaPlus,
  FaSearch,
  FaBan,
} from "react-icons/fa";
import Alert from "./Alert";
import ConfirmDialog from "./ConfirmDialog";

  function TransactionDetails({
  transaction,
  onClose,
  onAction, // e.g., approve/reject
  onUpdateInbound, // for inbound row updates
  onUpdatePurchase, // for purchase row updates
}) {
  const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";
  const authHeaders = () => ({
    headers: { Authorization: `Bearer ${sessionStorage.getItem("token")}` },
  });

  const [showReceipt, setShowReceipt] = useState(false);
  const [editableProducts, setEditableProducts] = useState([]);
  const [note, setNote] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [hasChanges, setHasChanges] = useState(false); // Track if we made changes

  // For adding new products to purchase
  const [showProductSearch, setShowProductSearch] = useState(false);
  const [allProducts, setAllProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingProducts, setLoadingProducts] = useState(false);

  // For editing rows - MOVE ALL HOOKS TO TOP LEVEL
  const [editingRow, setEditingRow] = useState(null);
  const [tempRowData, setTempRowData] = useState({});

  // Alert and Confirm Dialog
  const [alert, setAlert] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(null);

  // Initialize state only once when component mounts
  useEffect(() => {
    setEditableProducts(transaction.products || []);
    setNote(transaction.note || "");
  }, []);

  // Fetch products for purchase transactions
  useEffect(() => {
    if (transaction.type === "purchase" && (transaction.status === "pending" || transaction.status === "draft")) {
      const fetchProducts = async () => {
        try {
          setLoadingProducts(true);
          const res = await axios.get(`${API_BASE_URL}/api/product`, authHeaders());
          const prodData = Array.isArray(res.data?.data)
            ? res.data.data
            : Array.isArray(res.data?.products)
            ? res.data.products
            : Array.isArray(res.data)
            ? res.data
            : [];
          setAllProducts(prodData);
        } catch (err) {
          console.error("Error loading products:", err);
        } finally {
          setLoadingProducts(false);
        }
      };
      fetchProducts();
    }
  }, []);

  const currentUser = (() => {
    try {
      return JSON.parse(sessionStorage.getItem("user"));
    } catch {
      return null;
    }
  })();

  const isAdmin = currentUser?.role === "admin";
  if (!transaction) return null;

  // Check if transaction is editable
  const isEditable = transaction.status === "pending" || transaction.status === "draft";
  const isDraft = transaction.status === "draft";

  // Helper function for formatting prices
  const formatPrice = (price) => {
    return Number(price || 0).toFixed(2);
  };

  // ✅ Save inbound changes
  const handleSaveInbound = async () => {
    const payload = {
      transactionId: transaction._id,
      products: editableProducts.map((p) => ({
        productId: p.product?._id || p.product,
        receivedQuantity: p.receivedQuantity ?? p.quantity,
      })),
      note,
    };

    try {
      setIsProcessing(true);
      await onUpdateInbound?.(payload, false); // don’t refresh parent immediately
        setAlert({ type: "success", message: "✅ Inbound quantities updated successfully!" });
        setEditableProducts((prev) =>
          prev.map((p) => ({
            ...p,
            receivedQuantity:
              payload.products.find(
                (x) => x.productId === (p.product?._id || p.product)
              )?.receivedQuantity ?? p.receivedQuantity,
          }))
        );
    } catch (err) {
      console.error("Failed to update inbound:", err);
      setAlert({ type: "error", message: "Failed to save changes. Please try again." });
    } finally {
      setIsProcessing(false);
    }
  };

  // ✅ Add product function - completely isolated with debugging
  const handleAddProduct = async (product) => {
    console.log("🔵 Starting handleAddProduct for:", product.productName);
    
    try {
      // Check if product already exists
      const alreadyExists = editableProducts.some(
        (p) => (p.product?._id || p.product) === product._id
      );
      
      if (alreadyExists) {
        console.log("⚠️ Product already exists");
        setSuccessMessage("⚠️ This product is already in the transaction!");
        setTimeout(() => setSuccessMessage(""), 3000);
        return;
      }

      console.log("🔵 Creating new product entry...");
      const newProduct = {
        product: product,
        quantity: 1,
        receivedQuantity: 0,
        costPriceAtTransaction: Number(product.costPrice || 0),
        sellingPrice: Number(product.sellingPrice || 0),
        transactionSellingPrice: 0,
        unitPrice: Number(product.costPrice || 0),
        discountPercent: 0,
        discountedPrice: Number(product.costPrice || 0),
      };

      const updatedProducts = [...editableProducts, newProduct];
      console.log("🔵 Updated products array:", updatedProducts.length);

      console.log("🔵 Making API call...");
      // Direct API call - NO parent function calls whatsoever
      const response = await axios.put(
        `${API_BASE_URL}/api/transaction/${transaction._id}/purchase`,
        {
          products: updatedProducts.map((p) => ({
            productId: p.product?._id || p.product,
            quantity: p.quantity,
            unitPrice: p.unitPrice,
            discountPercent: p.discountPercent,
          })),
        },
        authHeaders()
      );

      console.log("🔵 API call successful:", response.status);

      // Update local state
      setEditableProducts(updatedProducts);
      setHasChanges(true);
      
      // Close the search modal after successful add
      setShowProductSearch(false);
      setSearchQuery("");
      
      console.log("🔵 Local state updated, setting success message...");
      setSuccessMessage(`✅ ${product.productName} added successfully!`);
      setTimeout(() => setSuccessMessage(""), 3000);
      
      console.log("🔵 handleAddProduct completed successfully - search modal closed, transaction modal stays open");
      
    } catch (err) {
      console.error("❌ Failed to add product:", err);
      setSuccessMessage(`❌ Failed to add product: ${err.response?.data?.message || err.message}`);
      setTimeout(() => setSuccessMessage(""), 5000);
    }
  };

  // ✅ Approve / Reject handlers
  const handleAction = (actionType) => {
    if (!onAction) return;

    // 🟡 If inbound approval, check quantities first
    if (transaction.type === "inbound" && actionType === "approve") {
      const incomplete = editableProducts.some(
        (p) =>
          p.receivedQuantity === undefined ||
          p.receivedQuantity === null ||
          p.receivedQuantity === 0
      );

      if (incomplete) {
        setConfirmDialog({
          title: "Incomplete Quantities",
          message: "⚠️ Some items have zero or missing received quantity.\nAre you sure you want to approve this inbound?",
          type: "warning",
          confirmText: "Approve Anyway",
          onConfirm: async () => {
            setConfirmDialog(null);
            await executeAction(actionType);
          },
          onCancel: () => setConfirmDialog(null),
        });
        return;
      } else {
        setConfirmDialog({
          title: "Confirm Inbound Approval",
          message: "Are you sure all received quantities are correct?\nThis will update stock levels.",
          type: "info",
          confirmText: "Approve",
          onConfirm: async () => {
            setConfirmDialog(null);
            await executeAction(actionType);
          },
          onCancel: () => setConfirmDialog(null),
        });
        return;
      }
    } else {
      // 🧾 Regular approval confirmation
      const confirmMsg =
        actionType === "approve"
          ? "Approve this transaction?"
          : "Reject this transaction?";

      setConfirmDialog({
        title: actionType === "approve" ? "Confirm Approval" : "Confirm Rejection",
        message: confirmMsg,
        type: actionType === "approve" ? "info" : "warning",
        confirmText: actionType === "approve" ? "Approve" : "Reject",
        onConfirm: async () => {
          setConfirmDialog(null);
          await executeAction(actionType);
        },
        onCancel: () => setConfirmDialog(null),
      });
    }
  };

  // Execute the action
  const executeAction = async (actionType) => {
    try {
      setIsProcessing(true);
      await onAction(transaction._id, actionType);
      setAlert({ type: "success", message: `Transaction ${actionType}d successfully!` });
      onClose();
    } catch (err) {
      console.error(`❌ Failed to ${actionType}:`, err);
      setAlert({ type: "error", message: `Failed to ${actionType} transaction. Please try again.` });
    } finally {
      setIsProcessing(false);
    }
  };

  // ✅ Cancel approved purchase transaction
  const handleCancel = () => {
    setConfirmDialog({
      title: "Cancel Purchase Order",
      message: "⚠️ Are you sure you want to cancel this purchase order?\n\nThis will:\n- Mark the PO as cancelled\n- Delete the linked inbound transaction\n- Reverse any stock that was received\n\nThis action cannot be undone!",
      type: "danger",
      confirmText: "Cancel PO",
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          setIsProcessing(true);
          await onAction(transaction._id, "cancel");
          setAlert({ type: "success", message: "✅ Purchase order cancelled successfully!" });
          onClose();
        } catch (err) {
          console.error("❌ Failed to cancel:", err);
          setAlert({ type: "error", message: "Failed to cancel transaction. Please try again." });
        } finally {
          setIsProcessing(false);
        }
      },
      onCancel: () => setConfirmDialog(null),
    });
  };

  // ✅ Delete draft transaction
  const handleDeleteDraft = () => {
    setConfirmDialog({
      title: "Delete Draft",
      message: "⚠️ Are you sure you want to delete this draft?\n\nThis action cannot be undone!",
      type: "danger",
      confirmText: "Delete",
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          setIsProcessing(true);
          await axios.delete(`${API_BASE_URL}/api/transaction/${transaction._id}/draft`, authHeaders());
          setAlert({ type: "success", message: "✅ Draft deleted successfully!" });
          onClose();
          window.location.reload();
        } catch (err) {
          console.error("❌ Failed to delete draft:", err);
          setAlert({ type: "error", message: "Failed to delete draft. Please try again." });
        } finally {
          setIsProcessing(false);
        }
      },
      onCancel: () => setConfirmDialog(null),
    });
  };

  // ✅ Submit draft for approval
  const handleSubmitDraft = () => {
    setConfirmDialog({
      title: "Submit Draft",
      message: "Submit this draft for approval?",
      type: "info",
      confirmText: "Submit",
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          setIsProcessing(true);
          await onAction(transaction._id, "submit");
          setAlert({ type: "success", message: "✅ Draft submitted for approval!" });
          onClose();
        } catch (err) {
          console.error("❌ Failed to submit draft:", err);
          setAlert({ type: "error", message: "Failed to submit draft. Please try again." });
        } finally {
          setIsProcessing(false);
        }
      },
      onCancel: () => setConfirmDialog(null),
    });
  };

  // ✅ Move cancelled to draft
  const handleMoveToDraft = () => {
    setConfirmDialog({
      title: "Move to Draft",
      message: "Move this cancelled transaction back to draft status?",
      type: "info",
      confirmText: "Move to Draft",
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          setIsProcessing(true);
          await onAction(transaction._id, "move-to-draft");
          setAlert({ type: "success", message: "✅ Transaction moved to draft successfully!" });
          onClose();
        } catch (err) {
          console.error("❌ Failed to move to draft:", err);
          setAlert({ type: "error", message: "Failed to move to draft. Please try again." });
        } finally {
          setIsProcessing(false);
        }
      },
      onCancel: () => setConfirmDialog(null),
    });
  };

  // ✅ Resubmit cancelled transaction
  const handleResubmit = () => {
    setConfirmDialog({
      title: "Resubmit Transaction",
      message: "Resubmit this cancelled transaction for approval?",
      type: "info",
      confirmText: "Resubmit",
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          setIsProcessing(true);
          await onAction(transaction._id, "resubmit");
          setAlert({ type: "success", message: "✅ Transaction resubmitted for approval!" });
          onClose();
        } catch (err) {
          console.error("❌ Failed to resubmit:", err);
          setAlert({ type: "error", message: "Failed to resubmit transaction. Please try again." });
        } finally {
          setIsProcessing(false);
        }
      },
      onCancel: () => setConfirmDialog(null),
    });
  };

  // ✅ Close handler - simple and clean with debugging
  const handleClose = () => {
    console.log("🔴 handleClose called - modal will close");
    onClose();
  };

  // 🧩 Modern Table Wrapper
  const TableWrapper = ({ children }) => (
    <div className="relative overflow-x-auto shadow-md sm:rounded-lg border border-gray-200">
      <table className="w-full text-sm text-left text-gray-600">{children}</table>
    </div>
  );

  // 🧩 Products Table Renderer - NO HOOKS INSIDE
  const renderProductsTable = () => {
    const type = transaction.type;
    const products = editableProducts || [];

    if (!products.length)
      return <p className="text-sm text-gray-500">No products listed</p>;

    // Helper functions for row editing
    const handleEditRow = (index) => {
      const product = products[index];
      setEditingRow(index);
      setTempRowData({
        quantity: product.quantity,
        unitPrice: product.unitPrice,
        discountPercent: product.discountPercent || 0,
      });
    };

    const handleSaveRow = async (index) => {
      try {
        const updated = [...editableProducts];
        updated[index].quantity = Number(tempRowData.quantity) || 0;
        updated[index].unitPrice = Number(tempRowData.unitPrice) || 0;
        updated[index].discountPercent = Number(tempRowData.discountPercent) || 0;

        const discountedPrice = updated[index].unitPrice * (1 - updated[index].discountPercent / 100);
        updated[index].discountedPrice = discountedPrice;

        await axios.put(
          `${API_BASE_URL}/api/transaction/${transaction._id}/purchase`,
          {
            products: updated.map((p) => ({
              productId: p.product?._id || p.product,
              quantity: p.quantity,
              unitPrice: p.unitPrice,
              discountPercent: p.discountPercent,
            })),
          },
          authHeaders()
        );

        setEditableProducts(updated);
        setHasChanges(true);
        setEditingRow(null);
        setTempRowData({});
        setSuccessMessage("✅ Purchase item updated successfully!");
        setTimeout(() => setSuccessMessage(""), 3000);
      } catch (err) {
        console.error("❌ Failed to save row:", err);
        setSuccessMessage("❌ Failed to save row changes.");
        setTimeout(() => setSuccessMessage(""), 3000);
      }
    };

    const handleDeleteRow = (index) => {
      if (products.length <= 1) {
        setAlert({ type: "warning", message: "⚠️ Cannot delete the last item. A transaction must have at least one product." });
        return;
      }

      const productName = products[index].product?.productName || "this item";
      setConfirmDialog({
        title: "Delete Item",
        message: `Are you sure you want to delete ${productName}?`,
        type: "danger",
        confirmText: "Delete",
        onConfirm: async () => {
          setConfirmDialog(null);
          try {
            const updated = [...editableProducts];
            updated.splice(index, 1);

            await axios.put(
              `${API_BASE_URL}/api/transaction/${transaction._id}/purchase`,
              {
                products: updated.map((p) => ({
                  productId: p.product?._id || p.product,
                  quantity: p.quantity,
                  unitPrice: p.unitPrice,
                  discountPercent: p.discountPercent,
                })),
              },
              authHeaders()
            );

            setEditableProducts(updated);
            setHasChanges(true);
            setAlert({ type: "success", message: "✅ Item deleted successfully!" });
          } catch (err) {
            console.error("❌ Failed to delete row:", err);
            setAlert({ type: "error", message: "❌ Failed to delete item. Please try again." });
          }
        },
        onCancel: () => setConfirmDialog(null),
      });
    };

    // 🟩 INBOUND
    if (type === "inbound") {
      const handleEditRow = (index) => {
        setEditingRow(index);
        setTempReceivedQty(
          products[index].receivedQuantity ??
            products[index].expectedQuantity ??
            products[index].quantity ??
            0
        );
      };

      const handleCancelEdit = () => {
        setEditingRow(null);
        setTempReceivedQty(null);
      };

      const handleSaveRow = async (index) => {
        try {
          const updated = [...editableProducts];
          updated[index].receivedQuantity = Number(tempReceivedQty) || 0;
          setEditableProducts(updated);

          const product = updated[index];
          const payload = {
            transactionId: transaction._id,
            products: [
              {
                productId: product.product?._id || product.product,
                receivedQuantity: product.receivedQuantity,
              },
            ],
          };

          await onUpdateInbound?.(payload, false); // optional flag to skip parent refresh
            setEditableProducts((prev) => {
              const updated = [...prev];
              updated[index].receivedQuantity = Number(tempReceivedQty) || 0;
              return updated;
            });
            setEditingRow(null);
            setTempReceivedQty(null);
            setAlert({ type: "success", message: "✅ Quantity updated successfully!" });
        } catch (err) {
          console.error("❌ Failed to save row:", err);
          setAlert({ type: "error", message: "Failed to save row changes." });
        }
      };

      return (
        <TableWrapper>
          <thead className="bg-gray-50 text-xs uppercase text-gray-600">
            <tr>
              <th className="px-4 py-3">Item Code</th>
              <th className="px-4 py-3">Product Name</th>
              <th className="px-4 py-3">Ordered Qty</th>
              <th className="px-4 py-3">Received Qty</th>
              <th className="px-4 py-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p, idx) => {
              const isRowEditing = editingRow === idx;
              const displayReceived =
                p.receivedQuantity ?? p.expectedQuantity ?? p.quantity ?? 0;

              return (
                <tr
                  key={idx}
                  className="bg-white border-b hover:bg-gray-50 transition-colors duration-150"
                >
                  <td className="px-4 py-3">{p.product?.itemCode || "-"}</td>
                  <td className="px-4 py-3">{p.product?.productName || "Unknown"}</td>
                  <td className="px-4 py-3">{p.expectedQuantity ?? p.quantity ?? "-"}</td>

                  <td className="px-4 py-3">
                    {isRowEditing ? (
                      <input
                        type="number"
                        min="0"
                        className="w-20 border border-gray-300 rounded-md p-1 text-center focus:ring-green-500 focus:border-green-500"
                        value={tempReceivedQty}
                        onChange={(e) => setTempReceivedQty(e.target.value)}
                      />
                    ) : (
                      <span
                        className={
                          Number(displayReceived) <
                          Number(p.expectedQuantity ?? p.quantity)
                            ? "text-red-600 font-medium"
                            : ""
                        }
                      >
                        {displayReceived}
                      </span>
                    )}
                  </td>

                  <td className="px-4 py-3 text-center flex justify-center gap-2">
                    {isRowEditing ? (
                      <>
                        <button
                          className="p-2 bg-green-600 hover:bg-green-700 text-white rounded-md"
                          onClick={() => handleSaveRow(idx)}
                        >
                          <FaCheck />
                        </button>
                        <button
                          className="p-2 bg-gray-400 hover:bg-gray-500 text-white rounded-md"
                          onClick={handleCancelEdit}
                        >
                          <FaTimes />
                        </button>
                      </>
                    ) : (
                      <button
                        className="p-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-md"
                        onClick={() => handleEditRow(idx)}
                      >
                        <FaEdit />
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </TableWrapper>
      );
    }

    // 🟨 OUTBOUND / TRANSFER
    if (["outbound", "transfer"].includes(type)) {
      return (
        <TableWrapper>
          <thead className="bg-gray-50 text-xs uppercase text-gray-600">
            <tr>
              <th className="px-4 py-3">Item Code</th>
              <th className="px-4 py-3">Product Name</th>
              <th className="px-4 py-3">Quantity</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p, idx) => (
              <tr key={idx} className="bg-white border-b hover:bg-gray-50">
                <td className="px-4 py-3">{p.product?.itemCode || "-"}</td>
                <td className="px-4 py-3">{p.product?.productName || "Unknown"}</td>
                <td className="px-4 py-3">{p.quantity}</td>
              </tr>
            ))}
          </tbody>
        </TableWrapper>
      );
    }

    // 🟦 SALE
    if (type === "sale") {
      return (
        <TableWrapper>
          <thead className="bg-gray-50 text-xs uppercase text-gray-600">
            <tr>
              <th className="px-4 py-3">Item Code</th>
              <th className="px-4 py-3">Product Name</th>
              <th className="px-4 py-3">Qty</th>
              <th className="px-4 py-3">Unit Price</th>
              {isAdmin && <th className="px-4 py-3">Cost Price</th>}
              {isAdmin && <th className="px-4 py-3">Profit</th>}
              {isAdmin && <th className="px-4 py-3">Margin %</th>}
              <th className="px-4 py-3">Total</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p, idx) => {
              const unit =
                Number(
                  p.transactionSellingPrice ??
                    p.unitPrice ??
                    p.product?.sellingPrice ??
                    0
                );
              const total = unit * Number(p.quantity || 0);
              const cost = Number(p.costPriceAtTransaction ?? 0);
              const profit = (unit - cost) * Number(p.quantity || 0);
              const margin = cost > 0 ? ((unit - cost) / cost) * 100 : 0;

              return (
                <tr key={idx} className="bg-white border-b hover:bg-gray-50">
                  <td className="px-4 py-3">{p.product?.itemCode || "-"}</td>
                  <td className="px-4 py-3">{p.product?.productName || "Unknown"}</td>
                  <td className="px-4 py-3">{p.quantity}</td>
                  <td className="px-4 py-3">₱{formatPrice(unit)}</td>
                  {isAdmin && <td className="px-4 py-3">₱{formatPrice(cost)}</td>}
                  {isAdmin && (
                    <td
                      className={`px-4 py-3 ${
                        profit >= 0 ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      ₱{formatPrice(profit)}
                    </td>
                  )}
                  {isAdmin && (
                    <td
                      className={`px-4 py-3 ${
                        margin >= 0 ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {formatPrice(margin)}%
                    </td>
                  )}
                  <td className="px-4 py-3 font-semibold">₱{formatPrice(total)}</td>
                </tr>
              );
            })}
          </tbody>
        </TableWrapper>
      );
    }

    // 🟫 PURCHASE
    if (type === "purchase") {
      const isPending = transaction.status === "pending";
      const isDraftOrPending = transaction.status === "pending" || transaction.status === "draft";
      const handleEditRow = (index) => {
        setEditingRow(index);
        setTempRowData({
          quantity: products[index].quantity ?? 0,
          unitPrice: products[index].unitPrice ?? 0,
          discountPercent: products[index].discountPercent ?? 0,
        });
      };

      const handleCancelEdit = () => {
        setEditingRow(null);
        setTempRowData({});
      };

      const handleSaveRow = async (index) => {
        try {
          const updated = [...editableProducts];
          updated[index].quantity = Number(tempRowData.quantity) || 0;
          updated[index].unitPrice = Number(tempRowData.unitPrice) || 0;
          updated[index].discountPercent = Number(tempRowData.discountPercent) || 0;

          const discountedPrice = updated[index].unitPrice * (1 - updated[index].discountPercent / 100);
          updated[index].discountedPrice = discountedPrice;

          // Make direct API call
          await axios.put(
            `${API_BASE_URL}/api/transaction/${transaction._id}/purchase`,
            {
              products: updated.map((p) => ({
                productId: p.product?._id || p.product,
                quantity: p.quantity,
                unitPrice: p.unitPrice,
                discountPercent: p.discountPercent,
              })),
            },
            authHeaders()
          );

          setEditableProducts(updated);
          setHasChanges(true); // Mark that we have changes
          setEditingRow(null);
          setTempRowData({});
          setSuccessMessage("✅ Purchase item updated successfully!");
          setTimeout(() => setSuccessMessage(""), 3000);
        } catch (err) {
          console.error("❌ Failed to save row:", err);
          setSuccessMessage("❌ Failed to save row changes.");
          setTimeout(() => setSuccessMessage(""), 3000);
        }
      };

      const handleDeleteRow = (index) => {
        if (products.length <= 1) {
          setAlert({ type: "warning", message: "⚠️ Cannot delete the last item. A transaction must have at least one product." });
          return;
        }

        const productName = products[index].product?.productName || "this item";
        setConfirmDialog({
          title: "Delete Item",
          message: `Are you sure you want to delete ${productName}?`,
          type: "danger",
          confirmText: "Delete",
          onConfirm: async () => {
            setConfirmDialog(null);
            try {
              const updated = [...editableProducts];
              updated.splice(index, 1); // Remove the item at index

              // Make direct API call
              await axios.put(
                `${API_BASE_URL}/api/transaction/${transaction._id}/purchase`,
                {
                  products: updated.map((p) => ({
                    productId: p.product?._id || p.product,
                    quantity: p.quantity,
                    unitPrice: p.unitPrice,
                    discountPercent: p.discountPercent,
                  })),
                },
                authHeaders()
              );

              setEditableProducts(updated);
              setHasChanges(true); // Mark that we have changes
              setAlert({ type: "success", message: "✅ Item deleted successfully!" });
            } catch (err) {
              console.error("❌ Failed to delete row:", err);
              setAlert({ type: "error", message: "❌ Failed to delete item. Please try again." });
            }
          },
          onCancel: () => setConfirmDialog(null),
        });
      };

      return (
        <TableWrapper>
          <thead className="bg-gray-50 text-xs uppercase text-gray-600">
            <tr>
              <th className="px-4 py-3">Item Code</th>
              <th className="px-4 py-3">Product Name</th>
              <th className="px-4 py-3">Quantity</th>
              <th className="px-4 py-3">Unit Price</th>
              <th className="px-4 py-3">Discount %</th>
              <th className="px-4 py-3">Discounted Price</th>
              <th className="px-4 py-3">Total</th>
              {isDraftOrPending && <th className="px-4 py-3 text-center">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {products.map((p, idx) => {
              const isRowEditing = editingRow === idx;
              const unit = isRowEditing ? Number(tempRowData.unitPrice ?? 0) : Number(p.unitPrice ?? 0);
              const discount = isRowEditing ? Number(tempRowData.discountPercent ?? 0) : Number(p.discountPercent ?? 0);
              const quantity = isRowEditing ? Number(tempRowData.quantity ?? 0) : Number(p.quantity || 0);
              const discountedPrice = unit * (1 - discount / 100);
              const total = discountedPrice * quantity;

              return (
                <tr key={idx} className="bg-white border-b hover:bg-gray-50 transition-colors duration-150">
                  <td className="px-4 py-3">{p.product?.itemCode || "-"}</td>
                  <td className="px-4 py-3">{p.product?.productName || "Unknown"}</td>

                  <td className="px-4 py-3">
                    {isRowEditing ? (
                      <input
                        type="number"
                        min="0"
                        className="w-20 border border-gray-300 rounded-md p-1 text-center focus:ring-green-500 focus:border-green-500"
                        value={tempRowData.quantity}
                        onChange={(e) => setTempRowData({ ...tempRowData, quantity: e.target.value })}
                      />
                    ) : (
                      quantity
                    )}
                  </td>

                  <td className="px-4 py-3">
                    {isRowEditing ? (
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        className="w-24 border border-gray-300 rounded-md p-1 text-center focus:ring-green-500 focus:border-green-500"
                        value={tempRowData.unitPrice}
                        onChange={(e) => setTempRowData({ ...tempRowData, unitPrice: e.target.value })}
                      />
                    ) : (
                      `₱${unit.toFixed(2)}`
                    )}
                  </td>

                  <td className="px-4 py-3">
                    {isRowEditing ? (
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        className="w-20 border border-gray-300 rounded-md p-1 text-center focus:ring-green-500 focus:border-green-500"
                        value={tempRowData.discountPercent}
                        onChange={(e) => setTempRowData({ ...tempRowData, discountPercent: e.target.value })}
                      />
                    ) : (
                      `${discount}%`
                    )}
                  </td>

                  <td className="px-4 py-3">₱{discountedPrice.toFixed(2)}</td>
                  <td className="px-4 py-3 font-semibold">₱{total.toFixed(2)}</td>

                  {isDraftOrPending && (
                    <td className="px-4 py-3 text-center flex justify-center gap-2">
                      {isRowEditing ? (
                        <>
                          <button
                            className="p-2 bg-green-600 hover:bg-green-700 text-white rounded-md"
                            onClick={() => handleSaveRow(idx)}
                          >
                            <FaCheck />
                          </button>
                          <button
                            className="p-2 bg-gray-400 hover:bg-gray-500 text-white rounded-md"
                            onClick={handleCancelEdit}
                          >
                            <FaTimes />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            className="p-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-md"
                            onClick={() => handleEditRow(idx)}
                          >
                            <FaEdit />
                          </button>
                          <button
                            className="p-2 bg-red-500 hover:bg-red-600 text-white rounded-md"
                            onClick={() => handleDeleteRow(idx)}
                          >
                            <FaTrash />
                          </button>
                        </>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </TableWrapper>
      );
    }

    return null;
  };

  // Filter products for search
  const filteredProducts = allProducts.filter((p) => {
    // Exclude products already in the transaction
    const alreadyAdded = editableProducts.some(
      (ep) => (ep.product?._id || ep.product) === p._id
    );
    if (alreadyAdded) return false;

    // If no search query, show all available products
    if (!searchQuery) return true;

    const q = searchQuery.toLowerCase();
    return (
      p.itemCode?.toLowerCase().includes(q) ||
      p.productName?.toLowerCase().includes(q)
    );
  });

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-40 p-4"
      onClick={onClose}
    >
      <div
        className="relative bg-white w-full max-w-5xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-800">Transaction Details</h2>
          <div className="flex gap-2">
            {/* Success Message Display */}
            {successMessage && (
              <div className={`px-3 py-1 rounded-lg text-sm font-medium ${
                successMessage.includes('✅') 
                  ? 'bg-green-100 text-green-800' 
                  : successMessage.includes('⚠️')
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-red-100 text-red-800'
              }`}>
                {successMessage}
              </div>
            )}
            
            <button
              onClick={handleClose}
              className="text-gray-500 hover:text-gray-700 text-xl font-bold"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Basic Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-y-2 gap-x-8 text-sm mb-6">
          <p>
            <strong>ID:</strong> {transaction._id}
          </p>
          {transaction.type === "purchase" && (
            <p>
              <strong>PO Number:</strong> {transaction.poNumber || "-"}
            </p>
          )}
          <p>
            <strong>Type:</strong> {transaction.type.toUpperCase()}
          </p>
          <p>
            <strong>Status:</strong> {transaction.status.toUpperCase()}
          </p>
          <p>
            <strong>Date:</strong> {new Date(transaction.createdAt).toLocaleString()}
          </p>
          {transaction.company && (
            <>
              <p>
                <strong>Company:</strong> {transaction.company.companyName}
              </p>
              {transaction.company.terms && (
                <p>
                  <strong>Payment Terms:</strong> {transaction.company.terms}
                </p>
              )}
            </>
          )}
        </div>

        {/* Products */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-semibold text-gray-700">Products</h3>
            {transaction.type === "purchase" && (transaction.status === "pending" || transaction.status === "draft") && (
              <button
                onClick={() => setShowProductSearch(true)}
                className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg text-sm"
              >
                <FaPlus /> Add Product
              </button>
            )}
          </div>
          {renderProductsTable()}
        </div>

        {/* Notes */}
        {transaction.type === "inbound" && transaction.linkedTransaction && (
          <div className="mb-4">
            <label className="block text-sm font-semibold mb-1">Note:</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              className="w-full border border-gray-300 rounded-md p-2 text-sm focus:ring-green-500 focus:border-green-500"
              placeholder="Add notes or remarks..."
            />
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap justify-end gap-3 mt-6">
          <button
            onClick={() => setShowReceipt(true)}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
          >
            <FaFileInvoice /> View Receipt
          </button>

          {transaction.type === "inbound" && transaction.linkedTransaction && (
            <button
              onClick={handleSaveInbound}
              disabled={isProcessing}
              className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg disabled:opacity-60"
            >
              <FaSave /> {isProcessing ? "Saving..." : "Save Changes"}
            </button>
          )}

          {isAdmin && transaction.status === "pending" && (
            <>
              <button
                onClick={() => handleAction("approve")}
                disabled={isProcessing}
                className="inline-flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg disabled:opacity-60"
              >
                <FaThumbsUp /> {isProcessing ? "Processing..." : "Approve"}
              </button>
              <button
                onClick={() => handleAction("reject")}
                disabled={isProcessing}
                className="inline-flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg disabled:opacity-60"
              >
                <FaThumbsDown /> {isProcessing ? "Processing..." : "Reject"}
              </button>
            </>
          )}

          {isAdmin && transaction.type === "purchase" && transaction.status === "approved" && (
            <button
              onClick={handleCancel}
              disabled={isProcessing}
              className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg disabled:opacity-60"
            >
              <FaBan /> {isProcessing ? "Processing..." : "Cancel PO"}
            </button>
          )}

          {/* Draft Actions */}
          {transaction.status === "draft" && (
            <>
              <button
                onClick={handleSubmitDraft}
                disabled={isProcessing}
                className="inline-flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg disabled:opacity-60"
              >
                <FaCheck /> {isProcessing ? "Processing..." : "Submit for Approval"}
              </button>
              <button
                onClick={handleDeleteDraft}
                disabled={isProcessing}
                className="inline-flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg disabled:opacity-60"
              >
                <FaTrash /> {isProcessing ? "Processing..." : "Delete Draft"}
              </button>
            </>
          )}

          {/* Cancelled Actions */}
          {transaction.status === "cancelled" && (
            <>
              <button
                onClick={handleMoveToDraft}
                disabled={isProcessing}
                className="inline-flex items-center gap-2 bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg disabled:opacity-60"
              >
                <FaEdit /> {isProcessing ? "Processing..." : "Move to Draft"}
              </button>
              <button
                onClick={handleResubmit}
                disabled={isProcessing}
                className="inline-flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg disabled:opacity-60"
              >
                <FaCheck /> {isProcessing ? "Processing..." : "Resubmit for Approval"}
              </button>
            </>
          )}
        </div>
      </div>

      {/* ✅ Product Search Modal - Similar to PurchaseCreate */}
      {showProductSearch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 backdrop-blur-lg bg-opacity-30"
            onClick={() => setShowProductSearch(false)}
          />
          <div className="relative bg-white rounded p-6 w-3/4 max-h-[80vh] overflow-y-auto shadow-lg">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold">Search Product</h2>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowProductSearch(false);
                    setSearchQuery("");
                    setSuccessMessage("");
                  }}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
                >
                  Done
                </button>
                <button
                  onClick={() => setShowProductSearch(false)}
                  className="text-red-600 font-bold text-xl"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Success/Error Message */}
            {successMessage && (
              <div className={`mb-4 p-3 rounded-lg text-sm font-medium ${
                successMessage.includes('✅') 
                  ? 'bg-green-100 text-green-800 border border-green-200' 
                  : successMessage.includes('⚠️')
                  ? 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                  : 'bg-red-100 text-red-800 border border-red-200'
              }`}>
                {successMessage}
              </div>
            )}

            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by code or name"
              className="border p-2 rounded w-full mb-4"
              onClick={(e) => e.stopPropagation()}
              onFocus={(e) => e.stopPropagation()}
            />
            
            {loadingProducts ? (
              <div className="text-center py-8">
                <p className="text-gray-500">Loading products...</p>
              </div>
            ) : (
              <table className="w-full text-sm text-left text-gray-500 border-collapse">
                <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                  <tr>
                    <th className="px-6 py-3">Item Code</th>
                    <th className="px-6 py-3">Product Name</th>
                    <th className="px-6 py-3">Unit</th>
                    <th className="px-6 py-3">Cost Price</th>
                    <th className="px-6 py-3 text-right">Select</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((p) => (
                    <tr
                      key={p._id}
                      className="bg-white border-b hover:bg-gray-50 text-gray-700"
                    >
                      <td className="px-6 py-4">{p.itemCode}</td>
                      <td className="px-6 py-4">{p.productName}</td>
                      <td className="px-6 py-4">{p.unitMeasure || "-"}</td>
                      <td className="px-6 py-4">₱{formatPrice(p.costPrice)}</td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            console.log("🔵 Select button clicked for:", p.productName);
                            handleAddProduct(p);
                          }}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded"
                        >
                          Select
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredProducts.length === 0 && allProducts.length > 0 && (
                    <tr>
                      <td colSpan="5" className="px-6 py-4 text-center text-gray-500">
                        No products found matching "{searchQuery}"
                      </td>
                    </tr>
                  )}
                  {allProducts.length === 0 && !loadingProducts && (
                    <tr>
                      <td colSpan="5" className="px-6 py-4 text-center text-gray-500">
                        No products available
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {showReceipt && (
        <ReceiptPreview
          transaction={{ ...transaction, products: editableProducts, note }}
          onClose={() => setShowReceipt(false)}
        />
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
          confirmText={confirmDialog.confirmText}
          type={confirmDialog.type}
          loading={isProcessing}
        />
      )}
    </div>
  );
}

export default TransactionDetails;