import React, { useEffect } from "react";
import { FaCheckCircle, FaExclamationCircle, FaInfoCircle, FaTimes } from "react-icons/fa";

const Alert = ({ type = "info", message, onClose, duration = 3000 }) => {
  useEffect(() => {
    if (duration && onClose) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  const styles = {
    success: {
      bg: "bg-green-50",
      border: "border-green-500",
      text: "text-green-800",
      icon: <FaCheckCircle className="text-green-500" size={20} />,
    },
    error: {
      bg: "bg-red-50",
      border: "border-red-500",
      text: "text-red-800",
      icon: <FaExclamationCircle className="text-red-500" size={20} />,
    },
    warning: {
      bg: "bg-yellow-50",
      border: "border-yellow-500",
      text: "text-yellow-800",
      icon: <FaExclamationCircle className="text-yellow-500" size={20} />,
    },
    info: {
      bg: "bg-blue-50",
      border: "border-blue-500",
      text: "text-blue-800",
      icon: <FaInfoCircle className="text-blue-500" size={20} />,
    },
  };

  const style = styles[type] || styles.info;

  return (
    <div className="fixed top-4 right-4 z-[9999] animate-slideIn">
      <div
        className={`${style.bg} ${style.border} ${style.text} border-l-4 p-4 rounded-lg shadow-lg min-w-[300px] max-w-md flex items-start gap-3`}
      >
        <div className="flex-shrink-0 mt-0.5">{style.icon}</div>
        <div className="flex-1">
          <p className="font-medium">{message}</p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="flex-shrink-0 text-gray-500 hover:text-gray-700 transition-colors"
          >
            <FaTimes size={16} />
          </button>
        )}
      </div>
    </div>
  );
};

export default Alert;

