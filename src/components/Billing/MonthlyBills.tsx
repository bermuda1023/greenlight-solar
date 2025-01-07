"use client";

import React, { useState } from "react";

const BillingScreen = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dateRange, setDateRange] = useState("");
  const [siteCapacity, setSiteCapacity] = useState("");

  const bills = [
    {
      customerName: "John Smith",
      siteName: "Residential Site A",
      billingPeriod: "Jan 1 - Jan 31, 2024",
      consumption: 450,
      export: 120,
      billAmount: "$85.50",
      status: "Paid",
    },
    {
      customerName: "Sarah Johnson",
      siteName: "Commercial Site B",
      billingPeriod: "Jan 1 - Jan 31, 2024",
      consumption: 780,
      export: 250,
      billAmount: "$142.30",
      status: "Pending",
    },
  ];

  return (
    <>
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div className="mb-2 p-1">
          <h1 className="text-2xl font-bold text-dark">Monthly Bills</h1>
          <p className="text-sm text-gray-500">
            View and manage generated bills for each customer.
          </p>
        </div>
        <button className="hover:bg-primary-dark rounded-md bg-primary px-4 py-2 text-white">
          <i className="fas fa-plus"></i> Generate Bills
        </button>
      </div>

      <div className="flex flex-col gap-10">
        <div className="rounded-[10px] border border-stroke bg-white shadow-1 dark:border-dark-3 dark:bg-gray-dark dark:shadow-card">

          <div className="p-4">
            {/* Filters */}
            <div className="mb-6 flex flex-col gap-4 md:flex-row">
              <div className="flex-1">
                <div className="relative">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search by Customer Name or Site Name"
                    className="w-full rounded-[7px] border-[1.5px] border-stroke bg-transparent px-5 py-3 text-dark outline-none transition placeholder:text-dark-6 focus:border-primary active:border-primary disabled:cursor-default dark:border-dark-3 dark:bg-dark-2 dark:text-white dark:focus:border-primary"
                  />
                </div>
              </div>
              <div className="flex gap-4">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="rounded-[7px] border-[1.5px] border-stroke bg-transparent px-5 py-3 text-dark outline-none transition focus:border-primary active:border-primary dark:border-dark-3 dark:bg-dark-2 dark:text-white"
                >
                  <option value="">Status: All</option>
                  <option value="paid">Paid</option>
                  <option value="pending">Pending</option>
                </select>
                <select
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value)}
                  className="rounded-[7px] border-[1.5px] border-stroke bg-transparent px-5 py-3 text-dark outline-none transition focus:border-primary active:border-primary dark:border-dark-3 dark:bg-dark-2 dark:text-white"
                >
                  <option value="">Date Range</option>
                  <option value="this-month">This Month</option>
                  <option value="last-month">Last Month</option>
                  <option value="custom">Custom Range</option>
                </select>
                <select
                  value={siteCapacity}
                  onChange={(e) => setSiteCapacity(e.target.value)}
                  className="rounded-[7px] border-[1.5px] border-stroke bg-transparent px-5 py-3 text-dark outline-none transition focus:border-primary active:border-primary dark:border-dark-3 dark:bg-dark-2 dark:text-white"
                >
                  <option value="">Site Capacity</option>
                  <option value="0-5">0-5 kW</option>
                  <option value="5-10">5-10 kW</option>
                  <option value="10+">10+ kW</option>
                </select>
              </div>
            </div>

            {/* Bills Table */}
            <div className="rounded-[10px] border border-stroke bg-white shadow-1 dark:border-dark-3 dark:bg-gray-dark">
              <div className="max-w-full overflow-x-auto">
                <table className="w-full table-auto">
                  <thead>
                    <tr className="border-b border-stroke bg-gray-2 dark:border-dark-3 dark:bg-dark-2">
                      <th className="px-6.5 py-4 text-left text-sm font-medium text-dark dark:text-white">
                        Customer Name
                      </th>
                      <th className="px-6.5 py-4 text-left text-sm font-medium text-dark dark:text-white">
                        Site Name
                      </th>
                      <th className="px-6.5 py-4 text-left text-sm font-medium text-dark dark:text-white">
                        Billing Period
                      </th>
                      <th className="px-6.5 py-4 text-left text-sm font-medium text-dark dark:text-white">
                        Consumption (kWh)
                      </th>
                      <th className="px-6.5 py-4 text-left text-sm font-medium text-dark dark:text-white">
                        Export (kWh)
                      </th>
                      <th className="px-6.5 py-4 text-left text-sm font-medium text-dark dark:text-white">
                        Bill Amount ($)
                      </th>
                      <th className="px-6.5 py-4 text-left text-sm font-medium text-dark dark:text-white">
                        Status
                      </th>
                      <th className="px-6.5 py-4 text-left text-sm font-medium text-dark dark:text-white">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {bills.map((bill, index) => (
                      <tr
                        key={index}
                        className="border-b border-stroke dark:border-dark-3"
                      >
                        <td className="px-6.5 py-4 text-sm dark:text-white">
                          {bill.customerName}
                        </td>
                        <td className="px-6.5 py-4 text-sm dark:text-white">
                          {bill.siteName}
                        </td>
                        <td className="px-6.5 py-4 text-sm dark:text-white">
                          {bill.billingPeriod}
                        </td>
                        <td className="px-6.5 py-4 text-sm dark:text-white">
                          {bill.consumption}
                        </td>
                        <td className="px-6.5 py-4 text-sm dark:text-white">
                          {bill.export}
                        </td>
                        <td className="px-6.5 py-4 text-sm font-medium dark:text-white">
                          {bill.billAmount}
                        </td>
                        <td className="px-6.5 py-4">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-sm font-medium ${
                              bill.status === "Paid"
                                ? "bg-success/10 text-success"
                                : "bg-warning/10 text-warning"
                            }`}
                          >
                            {bill.status}
                          </span>
                        </td>
                        <td className="px-6.5 py-4">
                          <div className="flex items-center space-x-3.5">
                            <button className="hover:text-primary">
                              <svg
                                className="fill-current"
                                width="18"
                                height="18"
                                viewBox="0 0 18 18"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                              >
                                <path
                                  d="M8.99981 14.8219C3.43106 14.8219 0.674805 9.50624 0.562305 9.28124C0.47793 9.11249 0.47793 8.88749 0.562305 8.71874C0.674805 8.49374 3.43106 3.17812 8.99981 3.17812C14.5686 3.17812 17.3248 8.49374 17.4373 8.71874C17.5217 8.88749 17.5217 9.11249 17.4373 9.28124C17.3248 9.50624 14.5686 14.8219 8.99981 14.8219ZM1.85605 8.99999C2.4748 10.0406 4.89356 13.5562 8.99981 13.5562C13.1061 13.5562 15.5248 10.0406 16.1436 8.99999C15.5248 7.95936 13.1061 4.44374 8.99981 4.44374C4.89356 4.44374 2.4748 7.95936 1.85605 8.99999Z"
                                  fill=""
                                ></path>
                                <path
                                  d="M9 11.3906C7.67812 11.3906 6.60938 10.3219 6.60938 9C6.60938 7.67813 7.67812 6.60938 9 6.60938C10.3219 6.60938 11.3906 7.67813 11.3906 9C11.3906 10.3219 10.3219 11.3906 9 11.3906ZM9 7.875C8.38125 7.875 7.875 8.38125 7.875 9C7.875 9.61875 8.38125 10.125 9 10.125C9.61875 10.125 10.125 9.61875 10.125 9C10.125 8.38125 9.61875 7.875 9 7.875Z"
                                  fill=""
                                ></path>
                              </svg>
                            </button>
                            <button className="hover:text-primary">
                              <svg
                                className="fill-current"
                                width="18"
                                height="18"
                                viewBox="0 0 18 18"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                              >
                                <path
                                  d="M16.8754 11.6719C16.5379 11.6719 16.2285 11.9531 16.2285 12.3187V14.8219C16.2285 15.075 16.0316 15.2719 15.7785 15.2719H2.22227C1.96914 15.2719 1.77227 15.075 1.77227 14.8219V12.3187C1.77227 11.9812 1.49102 11.6719 1.12539 11.6719C0.759766 11.6719 0.478516 11.9531 0.478516 12.3187V14.8219C0.478516 15.7781 1.26602 16.5656 2.22227 16.5656H15.7785C16.7348 16.5656 17.5223 15.7781 17.5223 14.8219V12.3187C17.5223 11.9531 17.2129 11.6719 16.8754 11.6719Z"
                                  fill=""
                                ></path>
                                <path
                                  d="M8.55074 12.7312C8.66324 12.8156 8.80261 12.8437 8.94199 12.8437C9.08136 12.8437 9.22074 12.7875 9.33324 12.7312L12.7895 10.3875C13.0707 10.1906 13.1269 9.79686 12.9301 9.51561C12.7332 9.23436 12.3395 9.17811 12.0582 9.37499L9.79199 10.9969V2.28436C9.79199 1.94686 9.51074 1.66561 9.17324 1.66561C8.83574 1.66561 8.55449 1.94686 8.55449 2.28436V10.9969L6.28824 9.37499C6.00699 9.17811 5.61324 9.23436 5.41636 9.51561C5.21949 9.79686 5.27574 10.1906 5.55699 10.3875L8.55074 12.7312Z"
                                  fill=""
                                ></path>
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between p-6">
                <div className="flex items-center">
                  <select className="rounded-[7px] border-[1.5px] border-stroke bg-transparent px-4 py-2 text-sm text-dark outline-none transition focus:border-primary dark:border-dark-3 dark:bg-dark-2 dark:text-white">
                    <option value="10">10 per page</option>
                    <option value="25">25 per page</option>
                    <option value="50">50 per page</option>
                  </select>
                  <span className="ml-4 text-sm text-dark dark:text-white">
                    Showing 1 to {bills.length} of {bills.length} results
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    className="rounded-[7px] border-[1.5px] border-stroke bg-transparent px-4 py-2 text-sm text-dark transition hover:bg-gray-200 disabled:opacity-50 dark:border-dark-3 dark:bg-dark-2 dark:text-white dark:hover:bg-dark-3"
                    disabled
                  >
                    Previous
                  </button>
                  <button
                    className="rounded-[7px] border-[1.5px] border-stroke bg-transparent px-4 py-2 text-sm text-dark transition hover:bg-gray-200 disabled:opacity-50 dark:border-dark-3 dark:bg-dark-2 dark:text-white dark:hover:bg-dark-3"
                    disabled
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default BillingScreen;
