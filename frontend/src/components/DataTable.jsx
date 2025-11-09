import { useState } from "react";
import {
  FaSortAlphaDown,
  FaSortAlphaUp,
  FaSortNumericDown,
  FaSortNumericUp,
  FaTrash,
  FaEdit,
  FaFileExport,
} from "react-icons/fa";

/**
 * Reusable DataTable Component with Filters and Sorting
 *
 * @param {Array} data - Array of data objects to display
 * @param {Array} columns - Column configuration array
 *   Each column object should have:
 *   - key: string (data property key)
 *   - label: string (column header label)
 *   - sortable: boolean (optional, default false)
 *   - sortType: 'alpha' | 'numeric' (optional, for sortable columns)
 *   - filter: object (optional) - { type: 'select', options: [{value, label}] }
 *   - render: function (optional) - custom render function (row, value) => JSX
 *   - className: string (optional) - custom cell className
 * @param {string} title - Table title
 * @param {string} searchPlaceholder - Placeholder text for search input
 * @param {function} onSearch - Custom search filter function (row, searchTerm) => boolean
 * @param {boolean} selectable - Enable row selection with checkboxes
 * @param {Array} actions - Action buttons to show when rows are selected
 *   Each action object should have:
 *   - label: string
 *   - icon: JSX element
 *   - onClick: function (selectedRows) => void
 *   - variant: 'primary' | 'danger' | 'success' (optional)
 * @param {JSX} headerActions - Custom header action buttons (Add, Import, etc.)
 */
const DataTable = ({
  data = [],
  columns = [],
  title = "Data Table",
  searchPlaceholder = "Search...",
  onSearch = null,
  selectable = false,
  actions = [],
  headerActions = null
}) => {
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({});
  const [sortBy, setSortBy] = useState(null);
  const [selectedRows, setSelectedRows] = useState([]);

  // Default search function
  const defaultSearch = (row, searchTerm) => {
    return Object.values(row).some((val) =>
      String(val).toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const searchFunction = onSearch || defaultSearch;

  // Apply filters and sorting
  const processedData = data
    .filter((row) => (search ? searchFunction(row, search) : true))
    .filter((row) => {
      return Object.entries(filters).every(([key, value]) => {
        if (!value) return true;
        const rowValue = row[key]?._id || row[key];
        return String(rowValue) === String(value);
      });
    })
    .sort((a, b) => {
      if (!sortBy) return 0;
      
      const [key, direction] = sortBy.split("-");
      const column = columns.find((col) => col.key === key);
      
      if (!column) return 0;

      let aVal = a[key];
      let bVal = b[key];

      // Handle nested objects (e.g., locationId.locationName)
      if (column.sortKey) {
        aVal = column.sortKey(a);
        bVal = column.sortKey(b);
      }

      if (column.sortType === "alpha") {
        const result = String(aVal || "").localeCompare(String(bVal || ""));
        return direction === "asc" ? result : -result;
      } else if (column.sortType === "numeric") {
        const result = Number(aVal || 0) - Number(bVal || 0);
        return direction === "asc" ? result : -result;
      }
      return 0;
    });

  const handleSort = (columnKey) => {
    const currentSort = sortBy?.startsWith(columnKey) ? sortBy.split("-")[1] : null;
    const newDirection = currentSort === "asc" ? "desc" : "asc";
    setSortBy(`${columnKey}-${newDirection}`);
  };

  const handleFilterChange = (columnKey, value) => {
    setFilters({ ...filters, [columnKey]: value });
  };

  // Selection handlers
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedRows(processedData.map((row) => row._id || row.id));
    } else {
      setSelectedRows([]);
    }
  };

  const handleSelectRow = (rowId) => {
    if (selectedRows.includes(rowId)) {
      setSelectedRows(selectedRows.filter((id) => id !== rowId));
    } else {
      setSelectedRows([...selectedRows, rowId]);
    }
  };

  const isAllSelected = processedData.length > 0 && selectedRows.length === processedData.length;
  const isSomeSelected = selectedRows.length > 0 && selectedRows.length < processedData.length;

  // Get action button styles
  const getActionButtonClass = (variant) => {
    const baseClass = "px-4 py-2 rounded-md font-medium transition-colors duration-200 flex items-center gap-2";
    switch (variant) {
      case "danger":
        return `${baseClass} bg-red-600 hover:bg-red-700 text-white`;
      case "success":
        return `${baseClass} bg-green-600 hover:bg-green-700 text-white`;
      case "primary":
      default:
        return `${baseClass} bg-blue-800 hover:bg-blue-000 text-white`;
    }
  };

  const getSortIcon = (columnKey, sortType) => {
    const isActive = sortBy?.startsWith(columnKey);
    const direction = isActive ? sortBy.split("-")[1] : "asc";

    if (sortType === "alpha") {
      return direction === "asc" ? <FaSortAlphaDown /> : <FaSortAlphaUp />;
    } else if (sortType === "numeric") {
      return direction === "asc" ? <FaSortNumericDown /> : <FaSortNumericUp />;
    }
    return null;
  };

  return (
    <div className="p-6 h-[calc(100vh-4rem)] flex flex-col rounded-sm bg-gray-50">
      {/* Header with Search and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-3">
        <h1 className="text-2xl font-bold">{title}</h1>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-1 sm:flex-initial sm:justify-end">
          <input
            type="text"
            placeholder={searchPlaceholder}
            className="border rounded-md p-2 w-full sm:w-64 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {headerActions && (
            <div className="flex gap-2">
              {headerActions}
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons - Show when rows are selected */}
      {selectable && selectedRows.length > 0 && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md flex items-center gap-3">
          <span className="text-sm font-medium text-blue-900">
            {selectedRows.length} row{selectedRows.length > 1 ? "s" : ""} selected
          </span>
          <div className="flex gap-2">
            {actions.map((action, idx) => (
              <button
                key={idx}
                onClick={() => {
                  const selected = processedData.filter((row) =>
                    selectedRows.includes(row._id || row.id)
                  );
                  action.onClick(selected);
                }}
                className={getActionButtonClass(action.variant)}
              >
                {action.icon}
                <span>{action.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Table Container */}
      <div className="relative flex-1 overflow-hidden bg-white shadow-md sm:rounded-lg">
        <div className="overflow-y-auto h-full">
          <table className="w-full text-sm text-left text-gray-500">
            <thead className="text-xs uppercase bg-gray-50 text-gray-700 sticky top-0 z-10 shadow-sm">
              <tr>
                {/* Select All Checkbox */}
                {selectable && (
                  <th scope="col" className="px-6 py-3 w-12">
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = isSomeSelected;
                      }}
                      onChange={handleSelectAll}
                      className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2 cursor-pointer"
                    />
                  </th>
                )}
                {columns.map((col) => (
                  <th key={col.key} scope="col" className="px-6 py-3">
                    <div className="flex items-center gap-2">
                      <span>{col.label}</span>
                      {col.sortable && (
                        <button
                          onClick={() => handleSort(col.key, col.sortType)}
                          className="inline-block text-gray-500 hover:text-gray-700"
                        >
                          {getSortIcon(col.key, col.sortType)}
                        </button>
                      )}
                    </div>
                    {col.filter && col.filter.type === "select" && (
                      <select
                        className="w-full mt-1 p-1 border rounded text-sm"
                        value={filters[col.key] || ""}
                        onChange={(e) => handleFilterChange(col.key, e.target.value)}
                      >
                        <option value="">All</option>
                        {col.filter.options.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    )}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {processedData.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length + (selectable ? 1 : 0)}
                    className="px-6 py-8 text-center text-gray-500"
                  >
                    No data found
                  </td>
                </tr>
              ) : (
                processedData.map((row, i) => {
                  const rowId = row._id || row.id || i;
                  const isSelected = selectedRows.includes(rowId);

                  return (
                    <tr
                      key={rowId}
                      className={`border-b border-gray-200 hover:bg-gray-50 ${
                        isSelected ? "bg-blue-50" : "bg-white"
                      }`}
                    >
                      {/* Row Checkbox */}
                      {selectable && (
                        <td className="px-6 py-4 w-12">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleSelectRow(rowId)}
                            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2 cursor-pointer"
                          />
                        </td>
                      )}
                      {columns.map((col) => {
                        const value = row[col.key];
                        const cellContent = col.render
                          ? col.render(row, value)
                          : value ?? "-";

                        return (
                          <td
                            key={col.key}
                            className={col.className || "px-6 py-4"}
                          >
                            {cellContent}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DataTable;

