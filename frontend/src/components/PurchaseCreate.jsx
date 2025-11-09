import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { FaPlus, FaTrash, FaSearch } from "react-icons/fa";
import PopoutForm from "./PopoutForm";

const PurchaseCreate = ({ onSuccess }) => {
  const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";
  const authHeaders = () => ({
    headers: { Authorization: `Bearer ${sessionStorage.getItem("pos-token")}` },
  });



  const [isAddingCompany, setIsAddingCompany] = useState(false);
  const [companies, setCompanies] = useState([]);
  const [locations, setLocations] = useState([]);
  const [allProducts, setAllProducts] = useState([]);
  const [products, setProducts] = useState([
    { code: "", details: null, quantity: 1, unitPrice: "", discount: "" },
  ]);
  const [selectedCompany, setSelectedCompany] = useState("");
  const [toLocation, setToLocation] = useState("");
  const [deliverTo, setDeliverTo] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [loading, setLoading] = useState(false);
  
  const dropdownRef = useRef(null);


  // Company Search 
  const [searchCompany, setSearchCompany] = useState("");
  const [showCompanyList, setShowCompanyList] = useState(false);

  // For search modal
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeRowIndex, setActiveRowIndex] = useState(null);

  const formatPrice = (num) =>
    typeof num === "number"
      ? num.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })
      : num;

  // ✅ Fetch data (companies, locations, products)
  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [c, l, p] = await Promise.all([
          axios.get(`${API_BASE_URL}/api/company`, authHeaders()),
          axios.get(`${API_BASE_URL}/api/location`, authHeaders()),
          axios.get(`${API_BASE_URL}/api/product`, authHeaders()),
        ]);
        setCompanies(c.data.data || []);
        setLocations(l.data.data || []);
        const prodData =
          Array.isArray(p.data?.data) ||
          Array.isArray(p.data?.products) ||
          Array.isArray(p.data)
            ? p.data.data || p.data.products || p.data
            : [];
        setAllProducts(prodData);
      } catch (err) {
        console.error("Error loading initial data", err);
      }
    };
    fetchAll();
  }, []);

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

  // ✅ Search filtering
  const filteredProducts = allProducts.filter((p) => {
    const q = searchQuery.toLowerCase();
    return (
      p.itemCode?.toLowerCase().includes(q) ||
      p.productName?.toLowerCase().includes(q)
    );
  });

  // ✅ Select product logic
  const selectProduct = (product, index) => {
    const newProducts = [...products];
    newProducts[index] = {
      code: product.itemCode,
      details: product,
      quantity: 1,
      unitPrice: product.costPrice ?? 0,
      discount: 0,
    };
    setProducts(newProducts);
    setShowSearch(false);
    setSearchQuery("");
    setActiveRowIndex(null);
  };

  // ✅ Field change handlers
  const handleQuantityChange = (i, v) => {
    const newList = [...products];
    newList[i].quantity = v;
    setProducts(newList);
  };

  const handleUnitPriceChange = (i, v) => {
    const newList = [...products];
    newList[i].unitPrice = v;
    setProducts(newList);
  };

  const handleDiscountChange = (i, v) => {
    const newList = [...products];
    newList[i].discount = v;
    setProducts(newList);
  };

  const addRow = () =>
    setProducts([
      ...products,
      { code: "", details: null, quantity: 1, unitPrice: "", discount: "" },
    ]);

  const removeRow = (i) => setProducts(products.filter((_, idx) => idx !== i));
  
  const handleAddCompany = async (formData) => {
    try {
      const res = await axios.post(`${API_BASE_URL}/api/company/add`, formData, authHeaders())
      const companyData = res.data?.data || res.data?.company || res.data;
  
      if (res.data?.success || res.status === 201) {
       alert("✅ Company added successfully!");
       setIsAddingCompany(false);

       // refresh list with proper headers
       const updated = await axios.get(`${API_BASE_URL}/api/company`, authHeaders());
       setCompanies(updated.data.data || []);
       if (companyData?._id) setSelectedCompany(companyData._id);
       return; // ✅ stop here to avoid falling through
     }

     alert(res.data?.message || "Failed to add company");
    } catch (err) {
      console.error("Error adding company:", err);
      alert("Error adding company");
    }
  };

  // ✅ Submit handler with draft option
  const handleSubmit = async (e, isDraft = false) => {
    e.preventDefault();
    if (!selectedCompany) return alert("Please select a company");
    if (!toLocation) return alert("Please select an inbound location");
    
    const payload = {
      type: "purchase",
      products: products
        .filter((p) => p.details)
        .map((p) => ({
          productId: p.details._id,
          quantity: Number(p.quantity),
          unitPrice: Number(p.unitPrice),
          discountPercent: Number(p.discount),
        })),
      toLocationId: toLocation,
      companyId: selectedCompany,
      deliverTo,
      deliveryDate,
      status: isDraft ? "draft" : "pending", // Set status based on button clicked
    };

    try {
      setLoading(true);
      const res = await axios.post(
        `${API_BASE_URL}/api/transaction`,
        payload,
        authHeaders()
      );
      if (!res.data.success) throw new Error("Failed to create purchase");
      alert(isDraft ? "✅ Purchase order saved as draft!" : "✅ Purchase order created successfully!");

      // Call onSuccess callback if provided
      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      console.error(err);
      alert("Error creating purchase");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
    
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Top Form */}
      <div className="grid grid-cols-2 gap-6">
  <div className="relative" ref={dropdownRef}>
    <label className="font-medium text-gray-700 block mb-1">Company</label>

    {/* Search Input */}
    <input
      type="text"
      placeholder="Search or select company..."
      value={searchCompany}
      onChange={(e) => {
        setSearchCompany(e.target.value);
        setShowCompanyList(true);
        // reset selection if user starts typing
        if (selectedCompany) setSelectedCompany("");
      }}
      onFocus={() => setShowCompanyList(true)}
      className="border rounded-lg p-2 w-full"
    />

    {/* Dropdown List */}
    {showCompanyList && (
      <div className="absolute z-10 bg-white border rounded-lg mt-1 w-full max-h-40 overflow-y-auto shadow-md">
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

        {/* Filtered Company List */}
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
                c._id === selectedCompany ? "bg-green-50 font-semibold" : ""
              }`}
              onClick={() => {
                setSelectedCompany(c._id);
                setSearchCompany(c.companyName); // show name in input
                setShowCompanyList(false);
              }}
            >
              {c.companyName}
            </div>
          ))}
        {/* No results */}
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
</div>

        <div>
          <label className="font-medium text-gray-700 block mb-1">
            Inbound Location
          </label>
          <select
            value={toLocation}
            onChange={(e) => setToLocation(e.target.value)}
            className="border rounded-lg p-2 w-full"
          >
            <option value="">-- Select Location --</option>
            {locations.map((l) => (
              <option key={l._id} value={l._id}>
                {l.locationName}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="font-medium text-gray-700 block mb-1">
            Deliver To
          </label>
          <input
            type="text"
            value={deliverTo}
            onChange={(e) => setDeliverTo(e.target.value)}
            className="border rounded-lg p-2 w-full"
          />
        </div>

        <div>
          <label className="font-medium text-gray-700 block mb-1">
            Delivery Date
          </label>
          <input
            type="date"
            value={deliveryDate}
            onChange={(e) => setDeliveryDate(e.target.value)}
            className="border rounded-lg p-2 w-full"
          />
        </div>
      <div className="border rounded-lg overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm text-center">
            <thead className="bg-gray-100 sticky top-0">
              <tr>
                <th className="border p-2">#</th>
                <th className="border p-2">Product</th>
                <th className="border p-2">Qty</th>
                <th className="border p-2">Unit Price</th>
                <th className="border p-2">Discount %</th>
                <th className="border p-2">Total</th>
                <th className="border p-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((row, i) => {
                const quantity = Number(row.quantity) || 0;
                const unitPrice = parseFloat(row.unitPrice) || 0;
                const discount = parseFloat(row.discount) || 0;
                const total = unitPrice * quantity * (1 - discount / 100);

                return (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="border p-2">{i + 1}</td>
                    <td className="border p-2 text-left px-3">
                      {row.details ? (
                        <div className="flex items-center justify-between">
                          <span>{row.details.productName}</span>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveRowIndex(i);
                              setShowSearch(true);
                            }}
                            className="text-green-600 hover:text-green-800 ml-2"
                          >
                            <FaSearch />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setActiveRowIndex(i);
                            setShowSearch(true);
                          }}
                          className="flex items-center gap-2 text-blue-600 hover:underline"
                        >
                          <FaSearch /> Search Product
                        </button>
                      )}
                    </td>
                    <td className="border p-2">
                      <input
                        type="number"
                        min="1"
                        value={row.quantity}
                        onChange={(e) =>
                          handleQuantityChange(i, e.target.value)
                        }
                        className="border rounded w-16 p-1 text-center"
                      />
                    </td>
                    <td className="border p-2">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={row.unitPrice}
                        onChange={(e) =>
                          handleUnitPriceChange(i, e.target.value)
                        }
                        className="border rounded w-24 p-1 text-right"
                      />
                    </td>
                    <td className="border p-2">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={row.discount}
                        onChange={(e) =>
                          handleDiscountChange(i, e.target.value)
                        }
                        className="border rounded w-20 p-1 text-right"
                      />
                    </td>
                    <td className="border p-2 text-right">
                      {total.toFixed(2)}
                    </td>
                    <td className="border p-2">
                      <button
                        type="button"
                        onClick={() => removeRow(i)}
                        disabled={products.length === 1}
                        className={`px-2 py-1 rounded ${
                          products.length === 1
                            ? "bg-gray-300 cursor-not-allowed"
                            : "bg-red-600 text-white hover:bg-red-700"
                        }`}
                      >
                        <FaTrash />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Row + Submit */}
      <div className="flex items-center justify-between pt-4">
        <button
          type="button"
          onClick={addRow}
          className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg"
        >
          <FaPlus /> <span>Add Product</span>
        </button>
        
        {/* Submit Buttons */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={(e) => handleSubmit(e, true)}
            disabled={loading}
            className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg font-medium disabled:opacity-60"
          >
            {loading ? "Saving..." : "Save as Draft"}
          </button>
          <button
            type="submit"
            onClick={(e) => handleSubmit(e, false)}
            disabled={loading}
            className={`px-6 py-2 rounded-lg text-white font-medium ${
              loading
                ? "bg-blue-400 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {loading ? "Submitting..." : "Submit for Approval"}
          </button>
        </div>
      </div>

      {/* ✅ Product Search Modal */}
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
                    <td className="px-6 py-4">₱{formatPrice(p.costPrice)}</td>
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
    </form>
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
    </>
  );
};

export default PurchaseCreate;
