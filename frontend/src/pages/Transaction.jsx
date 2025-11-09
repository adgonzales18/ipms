import React, { useEffect, useState } from "react";
import DataTable from "../components/DataTable";
import TransactionDetails from "../components/TransactionDetails";
import TransactionForm from "../components/TransactionForm";
import { FaPlus, FaEye } from "react-icons/fa";
import { motion } from "framer-motion";
import authHeaders from "../utils/authHeaders";
import Alert from "../components/Alert";

const Transactions = () => {
  const [transactions, setTransactions] = useState([]);
  const [selectedTx, setSelectedTx] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [alert, setAlert] = useState(null);

  const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

  // Generic API wrapper
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

  // Fetch all transactions
  const fetchTransactions = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/transaction`, authHeaders());
      const data = await res.json();
      if (data?.success) setTransactions(data.data);
    } catch (err) {
      console.error("Error fetching transactions:", err);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  // Handle approval/rejection/cancellation
  const handleApproval = async (id, action) => {
    try {
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
        setAlert({ type: "error", message: `Unknown action: ${action}` });
        return;
      }

      const res = await fetch(`${API_BASE_URL}/api/transaction/${id}/${endpoint}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionStorage.getItem("token")}`,
        },
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: "Unknown error" }));
        console.error("Transaction action error:", errorData);
        setAlert({ type: "error", message: errorData.message || `Failed to ${action} transaction` });
        return;
      }

      const data = await res.json();
      if (data.success) {
        // Success message based on action
        let successMsg;
        if (action === "approve") successMsg = "Transaction approved successfully!";
        else if (action === "reject") successMsg = "Transaction rejected successfully!";
        else if (action === "cancel") successMsg = "Purchase order cancelled successfully!";
        else if (action === "move-to-draft") successMsg = "Transaction moved to draft successfully!";
        else if (action === "resubmit") successMsg = "Transaction resubmitted successfully!";
        else if (action === "submit") successMsg = "Draft submitted for approval successfully!";

        setAlert({ type: "success", message: successMsg });
        fetchTransactions(); // Refresh list
        setSelectedTx(null); // Close modal
      } else {
        setAlert({ type: "error", message: data.message || `Failed to ${action} transaction` });
      }
    } catch (err) {
      console.error(`Error on ${action}:`, err);
      setAlert({ type: "error", message: `Error trying to ${action} transaction` });
    }
  };

  const handleUpdateInbound = async (payload, refresh = true) => {
    await apiRequest(() =>
      fetch(`${API_BASE_URL}/api/transaction/${payload.transactionId}/inbound`, {
        method: "PUT",
        ...authHeaders(),
        body: JSON.stringify({
          products: payload.products,
          note: payload.note,
        }),
      })
    );

    if (refresh) {
      await fetchTransactions(); // refresh list only when needed
      setSelectedTx(null); // close modal only when explicitly desired
    }
  };

  const handleUpdatePurchase = async (payload, refresh = true) => {
    await apiRequest(() =>
      fetch(`${API_BASE_URL}/api/transaction/${payload.transactionId}/purchase`, {
        method: "PUT",
        ...authHeaders(),
        body: JSON.stringify({
          products: payload.products,
        }),
      })
    );

    if (refresh) {
      await fetchTransactions();
      setSelectedTx(null);
    }
  };

  // Define columns for DataTable
  const columns = [
    {
      key: "type",
      label: "Type",
      render: (row) => <span className="capitalize">{row.type}</span>,
    },
    {
      key: "products",
      label: "Products",
      render: (row) => row.products.map((p) => p.product?.productName).join(", "),
    },
    {
      key: "quantities",
      label: "Quantities",
      render: (row) => row.products.map((p) => p.quantity).join(", "),
    },
    {
      key: "status",
      label: "Status",
      render: (row) => <span className="capitalize">{row.status}</span>,
    },
    {
      key: "requestedBy",
      label: "Requested By",
      render: (row) => row.requestedBy?.name || "-",
    },
    {
      key: "approvedBy",
      label: "Approved By",
      render: (row) => row.approvedBy?.name || "-",
    },
    {
      key: "location",
      label: "Location",
      render: (row) =>
        row.type === "transfer"
          ? `${row.fromLocation?.locationName} → ${row.toLocation?.locationName}`
          : row.fromLocation?.locationName || row.toLocation?.locationName || "-",
    },
    {
      key: "createdAt",
      label: "Date",
      render: (row) => new Date(row.createdAt).toLocaleString(),
    },
  ];

  // Filter out purchase transactions
  const filteredTransactions = transactions.filter((tx) => tx.type !== "purchase");

  return (
    <motion.div
      className="p-6 h-[calc(100vh-4rem)] flex flex-col rounded-sm bg-gray-50"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
    >
      <DataTable
        data={filteredTransactions}
        columns={columns}
        title="Transactions"
        searchPlaceholder="Search transactions..."
        onRowClick={(row) => setSelectedTx(row)}
        headerActions={
          <button
            onClick={() => setShowCreateForm(true)}
            className="flex items-center gap-2 bg-blue-800 hover:bg-blue-900 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <FaPlus /> Create Transaction
          </button>
        }
        actions={[
          {
            label: "View Details",
            icon: <FaEye />,
            onClick: (selectedRows) => {
              if (selectedRows.length === 1) {
                setSelectedTx(selectedRows[0]);
              } else {
                setAlert({ type: "warning", message: "Please select only one transaction to view details" });
              }
            },
            color: "blue",
          },
        ]}
      />

      {/* Transaction Details Modal */}
      {selectedTx && (
        <TransactionDetails
          transaction={selectedTx}
          onClose={() => {
            setSelectedTx(null);
            fetchTransactions();
          }}
          onAction={handleApproval}
          onUpdateInbound={handleUpdateInbound}
          onUpdatePurchase={handleUpdatePurchase}
        />
      )}

      {/* Create Transaction Form Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto bg-blue-900 bg-opacity-50">
          <div className="relative bg-white rounded-2xl w-full max-w-6xl max-h-[90vh] flex flex-col">
            {/* Sticky Header */}
            <div className="sticky top-0 bg-white p-6 pb-4 border-b rounded-t-2xl z-10">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">Create Transaction</h2>
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
              <TransactionForm
                API_BASE_URL={API_BASE_URL}
                authHeaders={authHeaders}
                apiRequest={apiRequest}
                onTransactionCreated={() => {
                  console.log("Transaction created!");
                  setShowCreateForm(false);
                  fetchTransactions();
                }}
              />
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
    </motion.div>
  );
}

export default Transactions;
