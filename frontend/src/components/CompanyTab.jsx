import React, { useState, useEffect } from "react";
import axios from "axios";
import { motion } from "framer-motion";
import { FaTrash, FaEdit, FaFileExport, FaPlus, FaFileImport } from "react-icons/fa";
import DataTable from "./DataTable";
import PopoutForm from "./PopoutForm";
import ConfirmDialog from "./ConfirmDialog";

const CompanyTab = ({ API_BASE_URL, authHeaders, apiRequest }) => {
  const [companies, setCompanies] = useState([]);
  const [deleteCompanyIds, setDeleteCompanyIds] = useState([]);
  const [editingCompany, setEditingCompany] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    await apiRequest(async () => {
      const response = await axios.get(`${API_BASE_URL}/api/company`, authHeaders());
      setCompanies(response.data.data || []);
    });
  };

  const confirmDelete = async () => {
    if (!deleteCompanyIds.length) return;
    setLoading(true);
    await apiRequest(async () => {
      await Promise.all(
        deleteCompanyIds.map((id) =>
          axios.delete(`${API_BASE_URL}/api/company/delete/${id}`, authHeaders())
        )
      );
      await fetchCompanies();
    });
    setLoading(false);
    setDeleteCompanyIds([]);
  };

  const handleAddCompany = async (data) => {
    setLoading(true);
    await apiRequest(async () => {
      await axios.post(`${API_BASE_URL}/api/company/add`, data, authHeaders());
      await fetchCompanies();
    });
    setShowAdd(false);
    setLoading(false);
  };

  const handleEditCompany = async (data) => {
    setLoading(true);
    await apiRequest(async () => {
      await axios.patch(`${API_BASE_URL}/api/company/update/${editingCompany._id}`, data, authHeaders());
      await fetchCompanies();
    });
    setEditingCompany(null);
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

        const companiesData = [];

        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(",").map((v) => v.trim().replace(/"/g, ""));

          const company = {
            companyName: values[0] || "",
            companyAddress: values[1] || "",
            companyEmail: values[2] || "",
            companyContactName: values[3] || "",
            companyContactNumber: parseInt(values[4]) || 0,
            companyOfficeNumber: parseInt(values[5]) || 0,
          };

          companiesData.push(company);
        }

        if (companiesData.length === 0) {
          alert("No valid companies found in CSV");
          setLoading(false);
          return;
        }

        await apiRequest(async () => {
          await Promise.all(
            companiesData.map((company) =>
              axios.post(`${API_BASE_URL}/api/company/add`, company, authHeaders())
            )
          );
          await fetchCompanies();
        });

        alert(`Successfully imported ${companiesData.length} company(ies)`);
        setShowImport(false);
        setImportFile(null);
      } catch (error) {
        console.error("Import error:", error);
        alert("Error importing companies. Please check the CSV format.");
      }
      setLoading(false);
    };

    reader.readAsText(importFile);
  };

  // Action handlers
  const handleDelete = (selectedRows) => {
    const ids = selectedRows.map((row) => row._id);
    setDeleteCompanyIds(ids);
  };

  const handleEdit = (selectedRows) => {
    if (selectedRows.length === 1) {
      setEditingCompany(selectedRows[0]);
    } else {
      alert("Please select only one company to edit");
    }
  };

  const handleExport = (selectedRows) => {
    const headers = ["Name", "Address", "Email", "Contact Name", "Contact Number", "Office Number"];
    const csvData = selectedRows.map((row) => [
      row.companyName || "",
      row.companyAddress || "",
      row.companyEmail || "",
      row.companyContactName || "",
      row.companyContactNumber || "",
      row.companyOfficeNumber || "",
    ]);

    const csvContent = [
      headers.join(","),
      ...csvData.map((row) => row.map((cell) => `"${cell}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `companies_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadTemplate = () => {
    const headers = ["Name", "Address", "Email", "Contact Name", "Contact Number", "Office Number"];
    const sampleData = [
      ["ABC Corporation", "123 Main St, City", "contact@abc.com", "John Doe", "1234567890", "9876543210"],
      ["XYZ Industries", "456 Park Ave, Town", "info@xyz.com", "Jane Smith", "5551234567", "5559876543"],
    ];

    const csvContent = [
      headers.join(","),
      ...sampleData.map((row) => row.map((cell) => `"${cell}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "company_import_template.csv");
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSearch = (searchTerm, data) => {
    if (!searchTerm) return data;
    const term = searchTerm.toLowerCase();
    return data.filter((company) =>
      (company.companyName || "").toLowerCase().includes(term) ||
      (company.companyEmail || "").toLowerCase().includes(term) ||
      (company.companyContactName || "").toLowerCase().includes(term)
    );
  };

  const columns = [
    {
      key: "companyName",
      label: "Company Name",
      sortable: true,
      sortType: "alpha",
    },
    {
      key: "companyAddress",
      label: "Address",
      sortable: true,
      sortType: "alpha",
    },
    {
      key: "companyEmail",
      label: "Email",
      sortable: true,
      sortType: "alpha",
    },
    {
      key: "companyContactName",
      label: "Contact Person",
      sortable: true,
      sortType: "alpha",
    },
    {
      key: "companyContactNumber",
      label: "Contact Number",
    },
    {
      key: "companyOfficeNumber",
      label: "Office Number",
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
        title="Companies"
        data={companies}
        columns={columns}
        searchPlaceholder="Search by name, email, or contact"
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
              <span>Add Company</span>
            </button>
          </>
        }
      />

      {/* Add Company Form */}
      {showAdd && (
        <PopoutForm
          title="Add Company"
          isOpen={showAdd}
          onClose={() => setShowAdd(false)}
          onSubmit={handleAddCompany}
          loading={loading}
          mode="form"
          fields={[
            { name: "companyName", label: "Company Name", required: true },
            { name: "companyAddress", label: "Address" },
            { name: "companyEmail", label: "Email", type: "email", required: true },
            { name: "companyContactName", label: "Contact Person" },
            { name: "companyContactNumber", label: "Contact Number", type: "text" },
            { name: "companyOfficeNumber", label: "Office Number", type: "text" },
            { name: "terms", label: "Payment Terms" },
          ]}
        />
      )}

      {/* Edit Company Form */}
      {editingCompany && (
        <PopoutForm
          title="Edit Company"
          isOpen={!!editingCompany}
          onClose={() => setEditingCompany(null)}
          onSubmit={handleEditCompany}
          loading={loading}
          mode="form"
          initialData={editingCompany}
          fields={[
            { name: "companyName", label: "Company Name", required: true },
            { name: "companyAddress", label: "Address" },
            { name: "companyEmail", label: "Email", type: "email", required: true },
            { name: "companyContactName", label: "Contact Person" },
            { name: "companyContactNumber", label: "Contact Number", type: "text" },
            { name: "companyOfficeNumber", label: "Office Number", type: "text" },
            { name: "terms", label: "Payment Terms" },
          ]}
        />
      )}

      {/* Delete Confirmation Dialog */}
      {deleteCompanyIds.length > 0 && (
        <ConfirmDialog
          title="Delete Company(ies)"
          message={`Are you sure you want to delete ${deleteCompanyIds.length} company(ies)? This action cannot be undone.`}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteCompanyIds([])}
          loading={loading}
        />
      )}

      {/* Import Dialog */}
      {showImport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Import Companies from CSV</h2>

            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">
                Upload a CSV file with the following columns:
              </p>
              <div className="bg-gray-50 p-3 rounded text-xs font-mono mb-2">
                Name, Address, Email, Contact Name, Contact Number, Office Number
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

export default CompanyTab;
