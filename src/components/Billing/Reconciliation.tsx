"use client";

import React, { useState, ChangeEvent } from "react";
import { IoMdCloudUpload } from "react-icons/io";
import { MdFileUpload, MdOutlineCancel } from "react-icons/md";

interface ColumnMapping {
  date: string;
  description: string;
  amount: string;
  customerName: string;
}

interface BillData {
  customerName: string;
  date: string;
  description: string;
  amount: number;
  status: string;
  paidAmount: number;
  pendingAmount: number;
}

interface CSVRow {
  [key: string]: string;
}

const Reconciliation = () => {
  const [activeTab, setActiveTab] = useState<string>("all");
  const [importStep, setImportStep] = useState<number>(0);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [mappedData, setMappedData] = useState<BillData[]>([]);
  const [csvColumns, setCsvColumns] = useState<string[]>([]);
  const [csvData, setCSVData] = useState<CSVRow[]>([]);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({
    date: "",
    description: "",
    amount: "",
    customerName: "",
  });

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
  };

  const parseCSV = (text: string) => {
    const lines = text.split("\n");
    const headers = lines[0]
      .split(",")
      .map((header) => header.replace(/["'\r]/g, "").trim());
    setCsvColumns(headers);

    const data = lines
      .slice(1)
      .map((line) => {
        const values = line
          .split(",")
          .map((value) => value.replace(/["'\r]/g, "").trim());
        const row: CSVRow = {};
        headers.forEach((header, index) => {
          row[header] = values[index] || "";
        });
        return row;
      })
      .filter((row) => Object.values(row).some((value) => value));

    setCSVData(data);
  };

  const parseCSVHeaders = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        // Split the first line by comma to get headers
        const headers = text
          .split("\n")[0]
          .split(",")
          .map((header) =>
            // Remove quotes and trim whitespace
            header.replace(/["'\r]/g, "").trim(),
          );
        setCsvColumns(headers);
      }
    };
    reader.readAsText(file);
  };

  const handleFileUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files[0] && files[0].type === "text/csv") {
      setUploadedFile(files[0]);
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        if (text) {
          parseCSV(text);
        }
      };
      reader.readAsText(files[0]);
      setImportStep(2);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const files = event.dataTransfer.files;
    if (files && files[0] && files[0].type === "text/csv") {
      setUploadedFile(files[0]);
      parseCSVHeaders(files[0]);
      setImportStep(2);
    } else {
      alert("Please upload a CSV file only");
    }
  };

  const handleMapping = () => {
    // Process CSV data using the column mapping
    const processedData: BillData[] = csvData.map((row) => {
      const amountValue = parseFloat(row[columnMapping.amount]);

      return {
        customerName: row[columnMapping.customerName],
        date: row[columnMapping.date],
        description: row[columnMapping.description],
        amount: isNaN(amountValue) ? 0 : amountValue,
        status: "Unmatched",
        paidAmount: 0,
        pendingAmount: amountValue,
      };
    });

    setMappedData(processedData);
    setImportStep(0);
  };

  const handleColumnMappingChange = (
    key: keyof ColumnMapping,
    value: string,
  ) => {
    setColumnMapping((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const ImportModal = () => (
    <div className="fixed inset-0 z-9999 flex items-center justify-center bg-gray-5 bg-opacity-50 backdrop-blur-sm">
      <div className="w-2/3 max-w-2xl rounded-lg bg-white p-8">
        {importStep === 1 && (
          <div>
            <div className="flex justify-between">
              <h2 className="mb-4 text-lg font-semibold text-dark">
                Upload Statement
              </h2>
              <button onClick={() => setImportStep(0)}>
                <MdOutlineCancel className="mb-4 text-2xl text-primary hover:text-red-600" />
              </button>
            </div>
            <div
              className="rounded-lg border-2 border-dashed border-gray-300 p-12 text-center"
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              <MdFileUpload className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-4 text-gray-500">
                Drag & drop your CSV file here or{" "}
                <label className="cursor-pointer text-primary">
                  browse
                  <input
                    type="file"
                    className="hidden"
                    accept=".csv"
                    onChange={handleFileUpload}
                  />
                </label>
              </p>
              {uploadedFile && (
                <p className="mt-2 text-sm text-gray-500">
                  Selected file: {uploadedFile.name}
                </p>
              )}
            </div>
          </div>
        )}

        {importStep === 2 && (
          <div>
            <div className="flex justify-between">
              <h2 className="mb-4 text-lg font-semibold text-dark">
                Map Columns
              </h2>
              <button onClick={() => setImportStep(0)}>
                <MdOutlineCancel className="mb-4 text-2xl text-primary hover:text-red-600" />
              </button>
            </div>
            <div className="space-y-4">
              {(
                Object.entries({
                  Date: "date",
                  Description: "description",
                  Amount: "amount",
                  "Customer Name": "customerName",
                }) as [string, keyof ColumnMapping][]
              ).map(([label, key]) => (
                <div key={key} className="grid grid-cols-2 items-center gap-4">
                  <span className="text-gray-700">{label}</span>
                  <select
                    className="rounded-md border p-2"
                    value={columnMapping[key]}
                    onChange={(e) =>
                      handleColumnMappingChange(key, e.target.value)
                    }
                  >
                    <option value="">Select column</option>
                    {csvColumns.map((column, index) => (
                      <option key={index} value={column}>
                        {column}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
              <div className="mt-6 flex justify-end gap-2">
                <button
                  className="rounded-md border px-4 py-2"
                  onClick={() => setImportStep(0)}
                >
                  Cancel
                </button>
                <button
                  className="rounded-md bg-blue-600 px-4 py-2 text-white"
                  onClick={handleMapping}
                >
                  Import Data
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="mb-2">
          <h1 className="text-2xl font-bold text-gray-800">
            Payment Reconciliation
          </h1>
          <p className="text-sm text-gray-500">
            Match bank payments with pending bills and mark them as reconciled.
          </p>
        </div>
        <button
          onClick={() => setImportStep(1)}
          className="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          <IoMdCloudUpload className="h-5 w-5" /> Import
        </button>
      </div>

      {/* Summary Cards */}
      <div className="mt-6 grid grid-cols-4 gap-4">
        <div className="rounded-lg bg-white p-6 shadow">
          <h3 className="text-sm font-medium text-gray-500">Total Bills</h3>
          <p className="mt-2 text-3xl font-semibold">120</p>
        </div>
        <div className="rounded-lg bg-white p-6 shadow">
          <h3 className="text-sm font-medium text-gray-500">Matched</h3>
          <p className="mt-2 text-3xl font-semibold text-green-600">80</p>
        </div>
        <div className="rounded-lg bg-white p-6 shadow">
          <h3 className="text-sm font-medium text-gray-500">
            Partially Matched
          </h3>
          <p className="mt-2 text-3xl font-semibold text-yellow-600">20</p>
        </div>
        <div className="rounded-lg bg-white p-6 shadow">
          <h3 className="text-sm font-medium text-gray-500">Unmatched</h3>
          <p className="mt-2 text-3xl font-semibold text-red-600">20</p>
        </div>
      </div>

      {/* Tabs and Table */}
      <div className="mt-8 rounded-lg bg-white shadow">
        <div className="border-b px-4">
          <nav className="-mb-px flex">
            {["all", "matched", "partially-matched", "unmatched"].map((tab) => (
              <button
                key={tab}
                onClick={() => handleTabChange(tab)}
                className={`mr-8 py-4 text-sm font-medium ${
                  activeTab === tab
                    ? "border-b-2 border-blue-600 text-blue-600"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {tab
                  .split("-")
                  .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                  .join(" ")}{" "}
                Bills
              </button>
            ))}
          </nav>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Customer Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Amount ($)
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {mappedData.map((row, index) => (
                <tr key={index}>
                  <td className="whitespace-nowrap px-6 py-4">{row.date}</td>
                  <td className="whitespace-nowrap px-6 py-4">
                    {row.customerName}
                  </td>
                  <td className="px-6 py-4">{row.description}</td>
                  <td className="whitespace-nowrap px-6 py-4">
                    {row.amount.toFixed(2)}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <span
                      className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                        row.status === "Matched"
                          ? "bg-green-100 text-green-800"
                          : row.status === "Partially Matched"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-red-100 text-red-800"
                      }`}
                    >
                      {row.status}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <button className="text-blue-600 hover:text-blue-900">
                      Reconcile
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {importStep > 0 && <ImportModal />}
    </div>
  );
};

export default Reconciliation;
