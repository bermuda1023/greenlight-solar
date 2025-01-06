"use client";

import React, { useState } from "react";

const Reconciliation = () => {
  const [activeTab, setActiveTab] = useState("matched");

  const handleTabChange = (tab: React.SetStateAction<string>) => {
    setActiveTab(tab);
  };

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-semibold">Payment Reconciliation</h1>
        <p className="text-gray-600">
          Match bank payments with pending bills and mark them as reconciled.
        </p>
      </div>

      {/* File Upload Section */}
      <div className="bg-white p-6 rounded-lg shadow mb-8">
        <h2 className="text-xl font-medium mb-4">Upload Bank Statement</h2>
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
          <p className="text-gray-500 mb-4">
            Drag & Drop your bank statement file here or{" "}
            <span className="text-blue-600 font-semibold cursor-pointer">
              click to upload
            </span>.
          </p>
          <p className="text-sm text-gray-400">Supported formats: CSV, Excel, PDF</p>
        </div>
        <button className="mt-4 px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
          Upload Statement
        </button>
      </div>

      {/* Tabs for Reconciliation Results */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex mb-4">
          {["matched", "partially-matched", "unmatched"].map((tab) => (
            <button
              key={tab}
              onClick={() => handleTabChange(tab)}
              className={`px-6 py-2 ${
                activeTab === tab
                  ? "border-b-2 border-blue-600 text-blue-600"
                  : "text-gray-500"
              }`}
            >
              {tab === "matched"
                ? "Matched Bills"
                : tab === "partially-matched"
                ? "Partially Matched"
                : "Unmatched Bills"}
            </button>
          ))}
        </div>

        {/* Reconciliation Table */}
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b">
              <th className="px-4 py-2 text-gray-600">Customer Name</th>
              <th className="px-4 py-2 text-gray-600">Site Name</th>
              <th className="px-4 py-2 text-gray-600">Bill Amount ($)</th>
              <th className="px-4 py-2 text-gray-600">Paid Amount ($)</th>
              <th className="px-4 py-2 text-gray-600">Pending Amount ($)</th>
              <th className="px-4 py-2 text-gray-600">Status</th>
              <th className="px-4 py-2 text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody>
            {/* Sample Data */}
            <tr className="border-b hover:bg-gray-100">
              <td className="px-4 py-2">John Doe</td>
              <td className="px-4 py-2">Solar Site 1</td>
              <td className="px-4 py-2">$200</td>
              <td className="px-4 py-2">$150</td>
              <td className="px-4 py-2">$50</td>
              <td className="px-4 py-2 text-yellow-500">Partially Matched</td>
              <td className="px-4 py-2">
                <button className="px-4 py-1 text-white bg-green-600 rounded hover:bg-green-700">
                  Mark as Reconciled
                </button>
              </td>
            </tr>
            {/* Add more rows dynamically */}
          </tbody>
        </table>
      </div>

      {/* Summary Section */}
      <div className="mt-8 grid grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-lg shadow text-center">
          <h3 className="text-lg font-medium text-gray-600">Total Bills</h3>
          <p className="text-2xl font-semibold text-gray-800">120</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow text-center">
          <h3 className="text-lg font-medium text-gray-600">Matched Bills</h3>
          <p className="text-2xl font-semibold text-green-600">80</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow text-center">
          <h3 className="text-lg font-medium text-gray-600">Pending Bills</h3>
          <p className="text-2xl font-semibold text-red-600">40</p>
        </div>
      </div>

      {/* Download Button */}
      <div className="mt-8 text-center">
        <button className="px-6 py-2 bg-gray-800 text-white rounded hover:bg-gray-900">
          Download Reconciliation Report
        </button>
      </div>
    </div>
  );
};

export default Reconciliation;
