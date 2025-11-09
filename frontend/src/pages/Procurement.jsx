import React, { useState, useEffect } from "react";
import { FaPlus, FaEye } from "react-icons/fa";
import PurchaseCreate from "../components/PurchaseCreate";
import DataTable from "../components/DataTable";
import TransactionDetails from "../components/TransactionDetails";
import { motion } from "framer-motion";
import authHeaders from "../utils/authHeaders";
import Alert from "../components/Alert";

const Purchase = () => {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [purchases, setPurchases] = useState([]);
  const [selectedPurchase, setSelectedPurchase] = useState(null);
  const [alert, setAlert] = useState(null);

  const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

  // Fetch purchase transactions
  const fetchPurchases = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/transaction?type=purchase`, authHeaders());
      const data = await res.json();
      if (data?.success) {
        setPurchases(data.data);
      }
    } catch (err) {
      console.error("Error fetching purchases:", err);
    }
  };

  useEffect(() => {
    fetchPurchases();
  }, []);

  // Handle approval/rejection/cancellation
  const handleApproval = async (id, action) => {
    // Map action to endpoint
    let endpoint;
    if (action === "approve") endpoint = "approve";
    else if (action === "reject") endpoint = "reject";
    else if (action === "cancel") endpoint = "cancel";
    else if (action === "move-to-draft") endpoint = "move-to-draft";
    else if (action === "resubmit") endpoint = "resubmit";
    else if (action === "submit") endpoint = "submit";
    else {
      console.error("Unknown action:", action);
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/transaction/${id}/${endpoint}`, {
        method: "PUT",
        ...authHeaders(),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: "Unknown error" }));
        console.error("Transaction action error:", errorData);
        setAlert({ type: "error", message: errorData.message || `Failed to ${action} transaction` });
        throw new Error(errorData.message || `Failed to ${action}`);
      }

      const data = await res.json();
      console.log(`✅ Transaction ${action}d:`, data);

      // Success message based on action
      let successMsg;
      if (action === "approve") successMsg = "Transaction approved successfully!";
      else if (action === "reject") successMsg = "Transaction rejected successfully!";
      else if (action === "cancel") successMsg = "Purchase order cancelled successfully!";
      else if (action === "move-to-draft") successMsg = "Transaction moved to draft successfully!";
      else if (action === "resubmit") successMsg = "Transaction resubmitted successfully!";
      else if (action === "submit") successMsg = "Draft submitted for approval successfully!";

      setAlert({ type: "success", message: successMsg });
      fetchPurchases();
      setSelectedPurchase(null);
    } catch (err) {
      console.error("Error handling transaction action:", err);
      if (!alert) {
        setAlert({ type: "error", message: err.message || `Failed to ${action} transaction` });
      }
      throw err;
    }
  };

  // Define columns for DataTable
  const columns = [
    {
      key: "poNumber",
      label: "PO Number",
      render: (row) => row.poNumber || "-",
    },
    {
      key: "company",
      label: "Company",
      render: (row) => row.company?.companyName || "-",
    },
    {
      key: "status",
      label: "Status",
      render: (row) => <span className="capitalize">{row.status}</span>,
    },
    {
      key: "toLocation",
      label: "Inbound Location",
      render: (row) => row.toLocation?.locationName || "-",
    },
    {
      key: "deliveryDate",
      label: "Delivery Date",
      render: (row) => row.deliveryDate ? new Date(row.deliveryDate).toLocaleDateString() : "-",
    },
    {
    key: "requestedBy", 
    label: "Requested By",
    render: (row) => row.requestedBy?.name || "-",
    },
    {
    key: "createdAt",
    label: "Created Date",
    render: (row) => new Date(row.createdAt).toLocaleDateString(),
    },
    {
    key: "approvedBy",
    label: "Approved By",
    render: (row) => row.approvedBy?.name || "-",
    },
    {
        key: "approvedAt",
        label: "Approval Date",
        render: (row) => row.approvedAt ? new Date(row.approvedAt).toLocaleDateString() : "-",
},
  ];

  return (
    <motion.div
      className="p-6 h-[calc(100vh-4rem)] flex flex-col rounded-sm bg-gray-50"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
    >
      {alert && <Alert type={alert.type} message={alert.message} onClose={() => setAlert(null)} />}
      <DataTable
        data={purchases}
        columns={columns}
        title="Purchase Orders"
        searchPlaceholder="Search purchase orders..."
        onRowClick={(row) => setSelectedPurchase(row)}
        headerActions={
          <button
            onClick={() => setShowCreateForm(true)}
            className="flex items-center gap-2 bg-blue-800 hover:bg-blue-900 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <FaPlus /> Create PO
          </button>
        }
        actions={[
          {
            label: "View Details",
            icon: <FaEye />,
            onClick: (selectedRows) => {
              if (selectedRows.length === 1) {
                setSelectedPurchase(selectedRows[0]);
              } else {
                alert("Please select only one purchase order to view details");
              }
            },
            color: "blue",
          },
        ]}
      />

      {/* Purchase Details Modal */}
      {selectedPurchase && (
        <TransactionDetails
          transaction={selectedPurchase}
          onClose={() => {
            setSelectedPurchase(null);
            fetchPurchases();
          }}
          onAction={handleApproval}
          onUpdateInbound={() => {}}
          onUpdatePurchase={() => {}}
        />
      )}

      {/* Create Purchase Form Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto bg-blue-900 bg-opacity-50">
          <div className="relative bg-white rounded-2xl w-full max-w-6xl max-h-[90vh] flex flex-col">
            {/* Sticky Header */}
            <div className="sticky top-0 bg-white p-6 pb-4 border-b rounded-t-2xl z-10">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">Create Purchase Order</h2>
                <button
                  onClick={() => setShowCreateForm(false)}
                  className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Scrollable Form Content */}
            <div className="overflow-y-auto flex-1 p-6">
              <PurchaseCreate
                onSuccess={() => {
                  setShowCreateForm(false);
                  fetchPurchases();
                }}
              />
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default Purchase;
