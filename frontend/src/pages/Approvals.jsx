import React, { useEffect, useState } from "react";
import DataTable from "../components/DataTable";
import TransactionDetails from "../components/TransactionDetails";
import { motion } from 'framer-motion';
import { FaEye } from "react-icons/fa";
import authHeaders from "../utils/authHeaders";
import Alert from "../components/Alert";

const Approvals = () => {
  const [transactions, setTransactions] = useState([]);
  const [selectedTx, setSelectedTx] = useState(null);
  const [alert, setAlert] = useState(null);

  const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

  const fetchPending = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/transaction?status=pending`, authHeaders());
      const data = await res.json();

      if (data?.success) {
        // Exclude transactions with type "inbound" or "purchase order"
        const filtered = data.data.filter(
          (tx) =>
            tx.type?.toLowerCase() !== "inbound" &&
            tx.type?.toLowerCase() !== "purchase order"
        );
        setTransactions(filtered);
      } else {
        setTransactions([]);
      }
    } catch (err) {
      console.error("Error fetching pending transactions:", err);
      if (err.response?.status === 401) {
        alert("Session expired. Logging out...");
        sessionStorage.clear();
        window.location.href = "/login";
      }
    }
  };

  useEffect(() => {
    fetchPending();
  }, []);

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
      fetchPending();
      setSelectedTx(null);
    } catch (err) {
      console.error("Error handling transaction action:", err);
      if (!alert) {
        setAlert({ type: "error", message: err.message || `Failed to ${action} transaction` });
      }
      throw err; // Re-throw so TransactionDetails can handle it
    }
  };

  // Define columns for DataTable
  const columns = [
    {
      key: "createdAt",
      label: "Date",
      render: (row) => new Date(row.createdAt).toLocaleString(),
    },
    {
      key: "type",
      label: "Type",
      render: (row) => <span className="capitalize">{row.type}</span>,
    },
    {
      key: "location",
      label: "Location",
      render: (row) =>
        row.locationId?.locationName ||
        row.fromLocation?.locationName ||
        row.toLocation?.locationName ||
        "-",
    },
    {
      key: "requestedBy",
      label: "Requested By",
      render: (row) => row.requestedBy?.name || "-",
    },
    {
        key: "approvedBy",
        label: "Approved By",
        render: (row) => (
          <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            {row.status}
          </span>
        ),
      },
    {
      key: "status",
      label: "Status",
      render: (row) => (
        <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
          {row.status}
        </span>
      ),
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
        data={transactions}
        columns={columns}
        title="Pending Approvals"
        searchPlaceholder="Search pending transactions..."
        onRowClick={(row) => setSelectedTx(row)}
        actions={[
          {
            label: "View Details",
            icon: <FaEye />,
            onClick: (selectedRows) => {
              if (selectedRows.length === 1) {
                setSelectedTx(selectedRows[0]);
              } else {
                alert("Please select only one transaction to view details");
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
            fetchPending();
          }}
          onAction={handleApproval}
          onUpdateInbound={() => {}}
          onUpdatePurchase={() => {}}
        />
      )}
    </motion.div>
  );
}

export default Approvals;