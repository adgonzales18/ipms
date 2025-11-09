import React, { useRef, useState } from "react";
import { FaTimes } from "react-icons/fa";

export default function PopoutForm({ title, fields = [], isOpen, onClose, onSubmit, loading = false, mode = "form", sampleCsvHeaders = [] }) {
  const fileRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (mode === "file") {
      const file = fileRef.current?.files?.[0];
      if (!file) return alert("Please select a CSV file.");
      onSubmit(file);
      return;
    }

    const data = {};
    fields.forEach((f) => {
      if (f.type === "checkbox") {
        data[f.name] = e.target[f.name].checked;
      } else {
        data[f.name] = e.target[f.name].value;
      }
    });
    onSubmit(data);
  };

  const downloadSample = () => {
    const csv = sampleCsvHeaders.join(",") + "\n";
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "products_sample.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const files = e.dataTransfer.files;
    if (files && files[0]) fileRef.current.files = files;
  };

  return (
    <div className="fixed inset-0 backdrop-blur-sm backdrop-brightness-75 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col my-auto">
        {/* Fixed Header */}
        <div className="p-6 pb-4 border-b sticky top-0 bg-white rounded-t-2xl">
          <button className="absolute top-3 right-3 text-gray-600 hover:text-gray-900" onClick={onClose}><FaTimes /></button>
          <h2 className="text-xl font-bold">{title}</h2>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 pt-4 overflow-y-auto flex-1">
          {mode === "file" ? (
            <>
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={onDrop}
                className={`border-2 border-dashed p-6 rounded text-center ${dragOver ? "border-blue-500 bg-blue-50" : "border-gray-200"}`}
              >
                <p className="mb-2">Drag & Drop CSV here, or</p>
                <input ref={fileRef} type="file" accept=".csv,text/csv" className="mb-3" />
                <div className="flex justify-center gap-2">
                  <button type="button" onClick={() => fileRef.current && fileRef.current.click()} className="px-4 py-2 bg-gray-800 text-white rounded">Choose File</button>
                  <button type="button" onClick={downloadSample} className="px-4 py-2 bg-gray-600 text-white rounded">Download Sample CSV</button>
                </div>
              </div>
            </>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              {fields.map((field) => (
                <div key={field.name}>
                  <label className="block text-sm font-medium mb-1">{field.label}</label>
                  {field.type === "select" ? (
                    <select name={field.name} defaultValue={field.defaultValue || ""} className="border p-2 rounded w-full" required={field.required}>
                      <option value="">{field.placeholder || "-- Select --"}</option>
                      {field.options?.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                    </select>
                  ) : field.type === "textarea" ? (
                    <textarea name={field.name} defaultValue={field.defaultValue || ""} className="border p-2 rounded w-full" rows={4} />
                  ) : (
                    <input name={field.name} type={field.type || "text"} defaultValue={field.defaultValue || ""} placeholder={field.placeholder || ""} className="border p-2 rounded w-full" required={field.required} />
                  )}
                </div>
              ))}
            </form>
          )}
        </div>

        {/* Fixed Footer */}
        <div className="p-6 pt-4 border-t sticky bottom-0 bg-white rounded-b-2xl">
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300 transition-colors">Cancel</button>
            {mode === "file" ? (
              <button type="button" onClick={handleSubmit} disabled={loading} className="bg-gray-800 text-white px-4 py-2 rounded hover:bg-gray-900 transition-colors disabled:opacity-50">
                {loading ? "Importing..." : "Import"}
              </button>
            ) : (
              <button type="submit" onClick={handleSubmit} disabled={loading} className="bg-blue-800 text-white px-4 py-2 rounded hover:bg-blue-900 transition-colors disabled:opacity-50">
                {loading ? "Saving..." : "Save"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
