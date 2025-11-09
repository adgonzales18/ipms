import React from "react";

const ApprovalDetails = ({ transaction, onClose, onAction }) => {
  if (!transaction) return null;

  return (
    <div
      className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-40"
      onClick={onClose}
    >
      <div
        className="bg-white w-3/4 max-h-[90vh] overflow-y-auto p-6 rounded-lg shadow-lg relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-600 hover:text-gray-800 text-2xl font-bold"
        >
          ✕
        </button>

        {/* Header */}
        <h2 className="text-xl font-bold mb-4">Transaction Details</h2>

        <div className="mb-4">
          <p>
            <strong>Type:</strong> {transaction.type}
          </p>
          <p>
            <strong>Status:</strong> {transaction.status}
          </p>
          <p>
            <strong>Date:</strong>{" "}
            {new Date(transaction.createdAt).toLocaleString()}
          </p>
          <p>
            <strong>Requested By:</strong> {transaction.requestedBy?.name}
          </p>
          <p>
            <strong>Location:</strong> {transaction.locationId?.name}
          </p>
        </div>

        {/* Products */}
        <div className="mb-6">
          <h3 className="font-semibold mb-2">Products</h3>
          <ul className="list-disc ml-6">
            {transaction.products.map((p, idx) => (
              <li key={idx}>
                {p.product?.productName} — {p.quantity} pcs
              </li>
            ))}
          </ul>
        </div>

        {/* Actions */}
        {transaction.status === "pending" && (
          <div className="flex justify-end gap-3">
            <button
              onClick={() => onAction(transaction._id, "approve")}
              className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
            >
              Approve
            </button>
            <button
              onClick={() => onAction(transaction._id, "reject")}
              className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
            >
              Reject
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default ApprovalDetails