import React from "react";
import { FaExclamationTriangle } from "react-icons/fa";

export default function ConfirmDialog({
  title,
  message,
  onConfirm,
  onCancel,
  loading,
  confirmText = "Confirm",
  cancelText = "Cancel",
  type = "danger"
}) {
  const typeStyles = {
    danger: {
      button: "bg-red-600 hover:bg-red-700",
      icon: "text-red-600",
    },
    warning: {
      button: "bg-yellow-600 hover:bg-yellow-700",
      icon: "text-yellow-600",
    },
    info: {
      button: "bg-blue-600 hover:bg-blue-700",
      icon: "text-blue-600",
    },
  };

  const style = typeStyles[type] || typeStyles.danger;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-blue-900 bg-opacity-50">
      <div className="bg-white rounded-2xl shadow-xl w-[400px] max-w-[90vw] p-6 animate-fadeIn">
        <div className="flex items-start gap-4 mb-4">
          <div className={`flex-shrink-0 ${style.icon}`}>
            <FaExclamationTriangle size={24} />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">{title || "Confirm"}</h3>
            <p className="text-gray-600">{message || "Are you sure?"}</p>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
            disabled={loading}
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`${style.button} text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50`}
          >
            {loading ? "Processing..." : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
