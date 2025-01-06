"use client";

import React, { useState } from "react";

const ReportsPage = () => {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [customer, setCustomer] = useState("");
  const [site, setSite] = useState("");

  const data = {
    labels: ["January", "February", "March", "April", "May"],
    datasets: [
      {
        label: "Billing Trends ($)",
        data: [300, 500, 400, 600, 700],
        backgroundColor: "rgba(75, 192, 192, 0.6)",
        borderColor: "rgba(75, 192, 192, 1)",
        borderWidth: 1,
      },
    ],
  };

  const handleGenerateReport = () => {
    // Logic to fetch or filter report data based on the inputs
    console.log("Generating report with:", { startDate, endDate, customer, site });
  };

  return (
    <div className="p-6">
      {/* Header Section */}
      <div className="mb-8">
        <h1 className="text-3xl font-semibold">Reports</h1>
        <p className="text-gray-600 mt-2">
          Generate and download detailed reports of billing, payments, and energy usage trends.
        </p>
      </div>

      {/* Filters Section */}
      <div className="bg-white p-6 rounded-lg shadow mb-8">
        <h2 className="text-xl font-medium mb-4">Filter Reports</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label htmlFor="start-date" className="block text-gray-600">Start Date</label>
            <input
              type="date"
              id="start-date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="border p-2 rounded w-full"
            />
          </div>
          <div>
            <label htmlFor="end-date" className="block text-gray-600">End Date</label>
            <input
              type="date"
              id="end-date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="border p-2 rounded w-full"
            />
          </div>
          <div>
            <label htmlFor="customer" className="block text-gray-600">Customer</label>
            <select
              id="customer"
              value={customer}
              onChange={(e) => setCustomer(e.target.value)}
              className="border p-2 rounded w-full"
            >
              <option value="">All Customers</option>
              <option value="Customer 1">Customer 1</option>
              <option value="Customer 2">Customer 2</option>
            </select>
          </div>
          <div>
            <label htmlFor="site" className="block text-gray-600">Site</label>
            <select
              id="site"
              value={site}
              onChange={(e) => setSite(e.target.value)}
              className="border p-2 rounded w-full"
            >
              <option value="">All Sites</option>
              <option value="Site 1">Site 1</option>
              <option value="Site 2">Site 2</option>
            </select>
          </div>
        </div>
        <button
          onClick={handleGenerateReport}
          className="mt-4 px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Generate Report
        </button>
      </div>

      {/* Reports Table */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-medium mb-4">Report Data</h2>
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b">
              <th className="px-4 py-2 text-gray-600">Customer Name</th>
              <th className="px-4 py-2 text-gray-600">Site Name</th>
              <th className="px-4 py-2 text-gray-600">Billing Period</th>
              <th className="px-4 py-2 text-gray-600">Bill Amount ($)</th>
              <th className="px-4 py-2 text-gray-600">Paid Amount ($)</th>
              <th className="px-4 py-2 text-gray-600">Pending Amount ($)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="px-4 py-2">John Doe</td>
              <td className="px-4 py-2">Solar Site 1</td>
              <td className="px-4 py-2">01/01/2025 - 01/31/2025</td>
              <td className="px-4 py-2">$500</td>
              <td className="px-4 py-2">$450</td>
              <td className="px-4 py-2">$50</td>
            </tr>
            {/* Add more rows dynamically */}
          </tbody>
        </table>
      </div>

      {/* Export Options & Summary */}
      <div className="mt-8 flex justify-between items-center">
        <div>
          <button className="px-6 py-2 bg-gray-800 text-white rounded hover:bg-gray-900">
            Download PDF
          </button>
          <button className="px-6 py-2 bg-gray-800 text-white rounded hover:bg-gray-900 ml-4">
            Download Excel
          </button>
          <button className="px-6 py-2 bg-gray-800 text-white rounded hover:bg-gray-900 ml-4">
            Download CSV
          </button>
        </div>
        <div className="flex gap-4">
          <div className="bg-white p-6 rounded-lg shadow text-center">
            <h3 className="text-lg font-medium text-gray-600">Total Customers</h3>
            <p className="text-2xl font-semibold text-gray-800">120</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow text-center">
            <h3 className="text-lg font-medium text-gray-600">Total Bills</h3>
            <p className="text-2xl font-semibold text-gray-800">500</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow text-center">
            <h3 className="text-lg font-medium text-gray-600">Total Revenue</h3>
            <p className="text-2xl font-semibold text-green-600">$50,000</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportsPage;
