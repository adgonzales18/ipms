import React, { useState, useEffect } from "react";
import axios from "axios";
import { motion } from "framer-motion";
import { FaTrash, FaEdit, FaFileExport, FaPlus, FaFileImport } from "react-icons/fa";
import DataTable from "./DataTable";
import PopoutForm from "./PopoutForm";
import ConfirmDialog from "./ConfirmDialog";

const LocationTab = ({ API_BASE_URL, authHeaders, apiRequest }) => {
  const [locations, setLocations] = useState([]);
  const [deleteLocationIds, setDeleteLocationIds] = useState([]);
  const [editingLocation, setEditingLocation] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchLocations();
  }, []);

  const fetchLocations = async () => {
    await apiRequest(async () => {
      const response = await axios.get(`${API_BASE_URL}/api/location`, authHeaders());
      setLocations(response.data.data || []);
    });
  };

  const confirmDelete = async () => {
    if (!deleteLocationIds.length) return;
    setLoading(true);
    await apiRequest(async () => {
      await Promise.all(
        deleteLocationIds.map((id) =>
          axios.delete(`${API_BASE_URL}/api/location/${id}`, authHeaders())
        )
      );
      await fetchLocations();
    });
    setLoading(false);
    setDeleteLocationIds([]);
  };

  const handleAddLocation = async (data) => {
    setLoading(true);
    await apiRequest(async () => {
      await axios.post(`${API_BASE_URL}/api/location`, data, authHeaders());
      await fetchLocations();
    });
    setShowAdd(false);
    setLoading(false);
  };

  const handleEditLocation = async (data) => {
    setLoading(true);
    await apiRequest(async () => {
      await axios.patch(`${API_BASE_URL}/api/location/${editingLocation._id}`, data, authHeaders());
      await fetchLocations();
    });
    setEditingLocation(null);
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

        const locationsData = [];

        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(",").map((v) => v.trim().replace(/"/g, ""));

          const location = {
            locationName: values[0] || "",
            locationDescription: values[1] || "",
          };

          locationsData.push(location);
        }

        if (locationsData.length === 0) {
          alert("No valid locations found in CSV");
          setLoading(false);
          return;
        }

        await apiRequest(async () => {
          await Promise.all(
            locationsData.map((location) =>
              axios.post(`${API_BASE_URL}/api/location`, location, authHeaders())
            )
          );
          await fetchLocations();
        });

        alert(`Successfully imported ${locationsData.length} location(s)`);
        setShowImport(false);
        setImportFile(null);
      } catch (error) {
        console.error("Import error:", error);
        alert("Error importing locations. Please check the CSV format.");
      }
      setLoading(false);
    };

    reader.readAsText(importFile);
  };

  const handleDelete = (selectedRows) => {
    const ids = selectedRows.map((row) => row._id);
    setDeleteLocationIds(ids);
  };

  const handleEdit = (selectedRows) => {
    if (selectedRows.length === 1) {
      setEditingLocation(selectedRows[0]);
    } else {
      alert("Please select only one location to edit");
    }
  };

  const handleExport = (selectedRows) => {
    const headers = ["Location Name", "Description"];
    const csvData = selectedRows.map((row) => [
      row.locationName || "",
      row.locationDescription || "",
    ]);

    const csvContent = [
      headers.join(","),
      ...csvData.map((row) => row.map((cell) => `"${cell}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `locations_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadTemplate = () => {
    const headers = ["Location Name", "Description"];
    const sampleData = [
      ["Main Warehouse", "Primary storage facility"],
      ["Branch 1", "Downtown branch location"],
    ];

    const csvContent = [
      headers.join(","),
      ...sampleData.map((row) => row.map((cell) => `"${cell}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "location_import_template.csv");
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSearch = (searchTerm, data) => {
    if (!searchTerm) return data;
    const term = searchTerm.toLowerCase();
    return data.filter((location) =>
      (location.locationName || "").toLowerCase().includes(term) ||
      (location.locationDescription || "").toLowerCase().includes(term)
    );
  };

  const columns = [
    {
      key: "locationName",
      label: "Location Name",
      sortable: true,
      sortType: "alpha",
    },
    {
      key: "locationDescription",
      label: "Description",
      sortable: true,
      sortType: "alpha",
    },
  ];

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
        title="Locations"
        data={locations}
        columns={columns}
        searchPlaceholder="Search by name or description"
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
              <span>Add Location</span>
            </button>
          </>
        }
      />

      {/* Add Location Form */}
      {showAdd && (
        <PopoutForm
          title="Add Location"
          isOpen={showAdd}
          onClose={() => setShowAdd(false)}
          onSubmit={handleAddLocation}
          loading={loading}
          mode="form"
          fields={[
            { name: "locationName", label: "Location Name", required: true },
            { name: "locationDescription", label: "Description" },
          ]}
        />
      )}

      {/* Edit Location Form */}
      {editingLocation && (
        <PopoutForm
          title="Edit Location"
          isOpen={!!editingLocation}
          onClose={() => setEditingLocation(null)}
          onSubmit={handleEditLocation}
          loading={loading}
          mode="form"
          initialData={editingLocation}
          fields={[
            { name: "locationName", label: "Location Name", required: true },
            { name: "locationDescription", label: "Description" },
          ]}
        />
      )}

      {/* Delete Confirmation Dialog */}
      {deleteLocationIds.length > 0 && (
        <ConfirmDialog
          title="Delete Location(s)"
          message={`Are you sure you want to delete ${deleteLocationIds.length} location(s)? This action cannot be undone.`}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteLocationIds([])}
          loading={loading}
        />
      )}

      {/* Import Dialog */}
      {showImport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Import Locations from CSV</h2>

            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">
                Upload a CSV file with the following columns:
              </p>
              <div className="bg-gray-50 p-3 rounded text-xs font-mono mb-2">
                Location Name, Description
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
  );
};

export default LocationTab;

