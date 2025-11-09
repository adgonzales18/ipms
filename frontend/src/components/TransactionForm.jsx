import React, { useState, useEffect, useRef } from "react";
import { FaEdit, FaTrash, FaSearch, FaPlus } from "react-icons/fa";
import axios from "axios";
import PopoutForm from "./PopoutForm";

const TransactionForm = ({ API_BASE_URL, authHeaders, apiRequest, onTransactionCreated }) =>  {
  const [type, setType] = useState("sale");
  const [products, setProducts] = useState([
    { code: "", details: null, quantity: 1, locked: false, customPrice: "" },
  ]);
  const [locations, setLocations] = useState([]);
  const [fromLocation, setFromLocation] = useState("");
  const [toLocation, setToLocation] = useState("");
  const [company, setCompany] = useState("");
  const [companies, setCompanies] = useState([]);
  const [isAddingCompany, setIsAddingCompany] = useState(false);
  const [searchCompany, setSearchCompany] = useState("");
  const [showCompanyList, setShowCompanyList] = useState(false);
  const dropdownRef = useRef(null);
  const [allProducts, setAllProducts] = useState([]);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeRowIndex, setActiveRowIndex] = useState(null);

  const user = JSON.parse(sessionStorage.getItem("pos-user"));
  const userLocationId = user?.locationId?._id || user?.locationId;

  const formatPrice = (num) =>
    typeof num === "number"
      ? num.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })
      : num;

  // Fetch locations
  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const res = await apiRequest(() =>
          fetch(`${API_BASE_URL}/api/location`, authHeaders()).then(
            (r) => r.json()
          )
        );
        let fetchedLocations = res?.data || res?.locations || res || [];
        if (
          userLocationId &&
          !fetchedLocations.some((loc) => loc._id === userLocationId)
        ) {
          fetchedLocations.push({
            _id: userLocationId,
            locationName: user?.locationId?.locationName || "My Location",
          });
        }
        setLocations(fetchedLocations);
      } catch (err) {
        console.error("Error fetching locations:", err);
      }
    };
    fetchLocations();
  }, [API_BASE_URL, apiRequest, userLocationId]);
    
  useEffect(() => {
      const handleClickOutside = (event) => {
        if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
          setShowCompanyList(false);
        }
      };
    
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }, []);

  // Fetch companies
  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/api/company`, authHeaders());
        const list = Array.isArray(res.data?.data)
          ? res.data.data
          : Array.isArray(res.data?.companys)
          ? res.data.companys
          : [];
        setCompanies(list);
      } catch (err) {
        console.error("Error fetching companies:", err);
        setCompanies([]);
      }
    };
    fetchCompanies();
  }, [API_BASE_URL]);

  // Fetch products
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await apiRequest(() =>
          fetch(`${API_BASE_URL}/api/product`, authHeaders()).then(
            (r) => r.json()
          )
        );
        setAllProducts(res?.data || res?.products || res || []);
      } catch (err) {
        console.error("Error fetching products:", err);
      }
    };
    fetchProducts();
  }, [API_BASE_URL, apiRequest]);

  const filteredProducts = allProducts.filter(
    (p) =>
      p.itemCode?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.productName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectProduct = (product, index) => {
    const newProducts = [...products];
    newProducts[index] = {
      code: product.itemCode,
      details: product,
      quantity: 1,
      customPrice: product.sellingPrice ?? 0,
      locked: true,
    };
    setProducts(newProducts);
    setShowSearch(false);
    setSearchQuery("");
    setActiveRowIndex(null);
  };

  const addProductRow = () =>
    setProducts((prev) => [
      ...prev,
      { code: "", details: null, quantity: 1, locked: false, customPrice: "" },
    ]);

  const removeProductRow = (i) =>
    setProducts((prev) => prev.filter((_, idx) => idx !== i));

  const unlockProductRow = (i) => {
    const newProducts = [...products];
    newProducts[i].locked = false;
    setProducts(newProducts);
  };

  const handleManualCode = (i, val) => {
    const newProducts = [...products];
    newProducts[i].code = val;
    const match = allProducts.find(
      (p) => p.itemCode?.toLowerCase() === val.toLowerCase()
    );
    if (match) {
      newProducts[i] = {
        code: match.itemCode,
        details: match,
        quantity: 1,
        customPrice: match.sellingPrice ?? 0,
        locked: true,
      };
    }
    setProducts(newProducts);
  };

  const handleQuantityChange = (i, val) => {
    const newProducts = [...products];
    newProducts[i].quantity = parseFloat(val) || 0;
    setProducts(newProducts);
  };

  const handlePriceChange = (i, val) => {
    const newProducts = [...products];
    newProducts[i].customPrice = val === "" ? "" : parseFloat(val) || 0;
    setProducts(newProducts);
  };

  const rowTotal = (p) => {
    if (type !== "sale") return 0;
    const price = Number(
      p.customPrice ||
        p.details?.sellingPrice ||
        p.details?.costPriceAtTransaction ||
        0
    );
    return price * Number(p.quantity || 0);
  };

  const handleAddCompany = async (formData) => {
    try {
      const res = await axios.post(`${API_BASE_URL}/api/company/add`, formData, authHeaders())

      if (res.data?.success || res.status === 201) {
        alert("✅ Company added successfully!");
        setIsAddingCompany(false);

        // refresh list
        const updated = await axios.get(`${API_BASE_URL}/api/company`, authHeaders());
        setCompanies(updated.data.data || []);
        setCompany(res.data.data?._id || "");
      } else {
        alert(res.data?.message || "Failed to add company");
      }
    } catch (err) {
      console.error("Error adding company:", err);
      alert("Error adding company");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (type === "sale" && !company) {
      alert("Please select a company before submitting.");
      return;
    }
    if (["sale", "outbound", "transfer"].includes(type) && !fromLocation) {
      alert("Please select a from location.");
      return;
    }
    if (["inbound", "transfer"].includes(type) && !toLocation) {
      alert("Please select a to location.");
      return;
    }

    const payloadProducts = products
      .filter((p) => p.details)
      .map((p) => ({
        productId: p.details._id,
        quantity: Number(p.quantity || 0),
        customPrice:
          type === "sale"
            ? Number(p.customPrice || p.details?.sellingPrice || 0)
            : undefined,
      }));

    const payload = {
      type,
      ...(type === "sale" && { companyId: company }),
      products: payloadProducts,
      ...(type !== "inbound" && ["sale", "outbound", "transfer"].includes(type)
        ? { fromLocationId: fromLocation }
        : {}),
      ...(type === "transfer" || type === "inbound"
        ? { toLocationId: toLocation }
        : {}),
    };

    try {
      const res = await apiRequest(() =>
        fetch(`${API_BASE_URL}/api/transaction`, {
          method: "POST",
          ...authHeaders(),
          body: JSON.stringify(payload),
        }).then((r) => r.json())
      );
      if (res?.success) {
        alert("✅ Transaction created!");
        setProducts([
          { code: "", details: null, quantity: 1, locked: false, customPrice: "" },
        ]);
        setFromLocation("");
        setToLocation("");
        setCompany("");
        onTransactionCreated?.();
      } else {
        alert(res?.message || "Failed to create transaction");
      }
    } catch (err) {
      console.error("Error submitting transaction:", err);
      alert("Error submitting transaction");
    }
  };

  return (
    <div className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Transaction Type */}
        <div className="flex gap-4 items-center">
          <label className="font-semibold">Transaction Type:</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="border border-gray-300 p-2 rounded"
          >
            <option value="sale">Sale</option>
            <option value="inbound">Inbound</option>
            <option value="outbound">Outbound</option>
            <option value="transfer">Transfer</option>
          </select>
        </div>

        {/* Company */}
        {type === "sale" && (
    <div className="relative" ref={dropdownRef}>
    <label className="font-semibold block mb-1">Company:</label>

    {/* Search Input */}
    <input
      type="text"
      placeholder="Search or select company..."
      value={searchCompany}
      onChange={(e) => {
        setSearchCompany(e.target.value);
        setShowCompanyList(true);
        if (company) setCompany(""); // clear selection when typing
      }}
      onFocus={() => setShowCompanyList(true)}
      className="border border-gray-300 p-2 rounded w-full"
    />

    {/* Dropdown List */}
    {showCompanyList && (
      <div className="absolute z-10 bg-white border rounded mt-1 w-full max-h-40 overflow-y-auto shadow-lg">
        {/* ➕ Add New Company Option */}
        <div
          className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-blue-600"
          onClick={() => {
            setShowCompanyList(false);
            setIsAddingCompany(true);
          }}
        >
          ➕ Add New Company
        </div>

        {/* Filtered Companies */}
        {companies
          .filter((c) =>
            c.companyName
              .toLowerCase()
              .includes(searchCompany?.toLowerCase() || "")
          )
          .map((c) => (
            <div
              key={c._id}
              className={`px-3 py-2 hover:bg-gray-100 cursor-pointer ${
                c._id === company ? "bg-green-50 font-semibold" : ""
              }`}
              onClick={() => {
                setCompany(c._id);
                setSearchCompany(c.companyName);
                setShowCompanyList(false);
              }}
            >
              {c.companyName}
            </div>
          ))}

        {/* No Results */}
        {companies.filter((c) =>
          c.companyName
            .toLowerCase()
            .includes(searchCompany?.toLowerCase() || "")
        ).length === 0 && (
          <div className="px-3 py-2 text-gray-500">No results found</div>
        )}
      </div>
    )}
  </div>
)}


        {/* Location Selection */}
        {["sale", "outbound", "transfer"].includes(type) && (
          <div>
            <label className="font-semibold">From Location:</label>
            <select
              value={fromLocation}
              onChange={(e) => setFromLocation(e.target.value)}
              className="border border-gray-300 p-2 rounded w-full"
            >
              <option value="">Select Location</option>
              {locations.map((l) => (
                <option key={l._id} value={l._id}>
                  {l.locationName}
                </option>
              ))}
            </select>
          </div>
        )}

        {["inbound", "transfer"].includes(type) && (
          <div>
            <label className="font-semibold">To Location:</label>
            <select
              value={toLocation}
              onChange={(e) => setToLocation(e.target.value)}
              className="border border-gray-300 p-2 rounded w-full"
            >
              <option value="">Select Location</option>
              {locations.map((l) => (
                <option key={l._id} value={l._id}>
                  {l.locationName}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Product Table */}
        <div className="relative overflow-x-auto shadow-md sm:rounded-lg bg-gray-50 border border-gray-200 max-h-[70vh] overflow-y-auto">
          <table className="w-full text-sm text-left text-gray-500">
            <thead className="sticky top-0 text-xs text-gray-700 uppercase bg-gray-100">
              <tr>
                <th className="px-6 py-3">Item Code</th>
                <th className="px-6 py-3">Name</th>
                <th className="px-6 py-3">Description</th>
                <th className="px-6 py-3">On Hand</th>
                {type === "sale" && <th className="px-6 py-3">Selling Price</th>}
                <th className="px-6 py-3">Quantity</th>
                {type === "sale" && <th className="px-6 py-3">Total</th>}
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p, i) => (
                <tr
                  key={i}
                  className="bg-white border-b hover:bg-gray-50 text-gray-700"
                >
                  <td className="px-6 py-4">
                    {p.locked ? (
                      p.code
                    ) : (
                      <input
                        type="text"
                        value={p.code}
                        onChange={(e) => handleManualCode(i, e.target.value)}
                        placeholder="Enter Code"
                        className="border rounded p-1 w-full text-center"
                      />
                    )}
                  </td>
                  <td className="px-6 py-4">{p.details?.productName || "-"}</td>
                  <td className="px-6 py-4">
                    {p.details?.productDescription || "-"}
                  </td>
                  <td className="px-6 py-4">{p.details?.stock ?? "-"}</td>

                  {type === "sale" && (
                    <td className="px-6 py-4">
                      <input
                        type="number"
                        value={
                          p.customPrice === ""
                            ? p.details?.sellingPrice ?? ""
                            : p.customPrice
                        }
                        onChange={(e) => handlePriceChange(i, e.target.value)}
                        className="border rounded p-1 w-24 text-center"
                      />
                    </td>
                  )}

                  <td className="px-6 py-4">
                    <input
                      type="number"
                      value={p.quantity}
                      onChange={(e) => handleQuantityChange(i, e.target.value)}
                      className="border rounded p-1 w-20 text-center"
                    />
                  </td>

                  {type === "sale" && (
                    <td className="px-6 py-4 font-medium text-gray-900">
                      ₱{formatPrice(rowTotal(p))}
                    </td>
                  )}

                  <td className="px-6 py-4 text-right space-x-2">
                    {p.locked ? (
                      <>
                        <button
                          type="button"
                          onClick={() => unlockProductRow(i)}
                          className="bg-yellow-500 text-white p-2 rounded"
                        >
                          <FaEdit />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeProductRow(i)}
                          className="bg-red-500 text-white p-2 rounded"
                        >
                          <FaTrash />
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setActiveRowIndex(i);
                          setShowSearch(true);
                        }}
                        className="bg-green-600 text-white p-2 rounded"
                      >
                        <FaSearch />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Add and Submit Buttons */}
        <button
          type="button"
          onClick={addProductRow}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
        >
          <FaPlus /> Add Empty Row
        </button>

        <button
          type="submit"
          className="bg-gray-800 hover:bg-gray-900 text-white px-6 py-2 rounded"
        >
          Submit Transaction
        </button>
      </form>

      {/* Search Modal */}
      {showSearch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 backdrop-blur-lg bg-opacity-30"
            onClick={() => setShowSearch(false)}
          />
          <div className="relative bg-white rounded p-6 w-3/4 max-h-[80vh] overflow-y-auto shadow-lg">
            <button
              onClick={() => setShowSearch(false)}
              className="absolute top-2 right-2 text-red-600 font-bold"
            >
              ✕
            </button>
            <h2 className="text-lg font-bold mb-4">Search Product</h2>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by code or name"
              className="border p-2 rounded w-full mb-4"
            />
            <table className="w-full text-sm text-left text-gray-500 border-collapse">
              <thead className="text-xs text-gray-700 uppercase bg-gray-100">
                <tr>
                  <th className="px-6 py-3">Item Code</th>
                  <th className="px-6 py-3">Name</th>
                  <th className="px-6 py-3">Unit</th>
                  <th className="px-6 py-3">Price</th>
                  <th className="px-6 py-3">Stock</th>
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
                    <td className="px-6 py-4">{p.unitMeasure}
                    </td>
                    <td className="px-6 py-4">₱{formatPrice(p.sellingPrice)}</td>
                    <td className="px-6 py-4">{p.stock ?? "-"}</td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => selectProduct(p, activeRowIndex)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded"
                      >
                        Select
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {isAddingCompany && (
        <PopoutForm
          title="Add New Company"
          isOpen={isAddingCompany}
          onClose={() => setIsAddingCompany(false)}
          onSubmit={handleAddCompany}
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
    </div>
  );
}
export default TransactionForm;