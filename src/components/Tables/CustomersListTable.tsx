"use client";

import { useRouter } from "next/navigation";
import React, { useState, useEffect, useCallback } from "react";
import { FaPlus, FaArrowLeft, FaArrowRight } from "react-icons/fa";
import { AiOutlineSearch } from "react-icons/ai";
import { TbReceipt } from "react-icons/tb";
import { Dialog, DialogContent } from "@/components/ui/Dialog";
import flatpickr from "flatpickr";
import { supabase } from "@/utils/supabase/browserClient";

interface Customer {
  id: string;
  site_name: string;
  email: string;
  site_id: string;
  price_cap: string;
  production_kwh: number;
  self_cons_kwh: number;
  consump_kwh: number;
  export_kwh: number;
  belco_price: string;
  effective_price: string;
  bill_period: string;
  ex_days: number;
  savings: string;
  status: string;
  created_at: string;
}

const CustomersListTable = () => {
  const today = new Date();
  const formattedToday = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(today);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [startDate, setStartDate] = useState<string>(formattedToday);
  const [endDate, setEndDate] = useState<string>(formattedToday);
  const [siteCapacity, setSiteCapacity] = useState("");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [showBillModal, setShowBillModal] = useState(false);

  useEffect(() => {
    const startDatePicker = flatpickr("#startDate", {
      mode: "single",
      static: true,
      monthSelectorType: "static",
      dateFormat: "M j, Y",
      onChange: (selectedDates) => {
        const dateToFormat = selectedDates[0] || new Date();
        const formattedDate = new Intl.DateTimeFormat("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        }).format(dateToFormat);
        setStartDate(formattedDate);
      },
    });

    const endDatePicker = flatpickr("#endDate", {
      mode: "single",
      static: true,
      monthSelectorType: "static",
      dateFormat: "M j, Y",
      onChange: (selectedDates) => {
        const dateToFormat = selectedDates[0] || new Date();
        const formattedDate = new Intl.DateTimeFormat("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        }).format(dateToFormat);
        setEndDate(formattedDate);
      },
    });

    return () => {
      if (startDatePicker && "destroy" in startDatePicker) {
        (startDatePicker as any).destroy();
      }
      if (endDatePicker && "destroy" in endDatePicker) {
        (endDatePicker as any).destroy();
      }
    };
  }, []);

  const fetchCustomers = useCallback(async () => {
    try {
      setLoading(true);

      // First, get total count for pagination
      const countQuery = supabase
        .from("customers")
        .select("*", { count: "exact" });

      if (searchTerm) {
        countQuery.or(
          `site_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`,
        );
      }

      if (statusFilter) {
        countQuery.eq("status", statusFilter);
      }

      const { count } = await countQuery;
      setTotalCount(count || 0);

      // Then fetch paginated data
      let query = supabase
        .from("customers")
        .select("*")
        .range((currentPage - 1) * pageSize, currentPage * pageSize - 1)
        .order("created_at", { ascending: false });

      if (searchTerm) {
        query = query.or(
          `site_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`,
        );
      }

      if (statusFilter) {
        query = query.eq("status", statusFilter);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      setCustomers(data || []);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "An error occurred while fetching customers",
      );
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, statusFilter, currentPage, pageSize]); // Add all dependencies

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const handleSelectCustomer = (customerId: string) => {
    setSelectedCustomers((prev) =>
      prev.includes(customerId)
        ? prev.filter((id) => id !== customerId)
        : [...prev, customerId],
    );
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedCustomers(customers.map((customer) => customer.id));
    } else {
      setSelectedCustomers([]);
    }
  };

  const handleGenerateBill = () => {
    if (selectedCustomers.length === 0) {
      alert("Please select at least one customer");
      return;
    }
    if (!startDate || !endDate) {
      alert("Please select both start and end dates");
      return;
    }
    setShowBillModal(true);
  };

  return (
    <>
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div className="mb-2 p-1">
          <h1 className="text-2xl font-bold text-dark">Customers List</h1>
          <p className="text-sm text-gray-500">View and manage customers.</p>
        </div>
        <div className="flex items-center gap-4">
          <input
            id="startDate"
            className="form-datepicker w-full rounded-[7px] border-[1.5px] border-stroke bg-transparent bg-white px-5 py-3 font-normal outline-none transition focus:border-primary active:border-primary dark:border-dark-3 dark:bg-dark-2 dark:focus:border-primary"
            placeholder="Start Date"
          />
          <input
            id="endDate"
            className="form-datepicker w-full rounded-[7px] border-[1.5px] border-stroke bg-transparent bg-white px-5 py-3 font-normal outline-none transition focus:border-primary active:border-primary dark:border-dark-3 dark:bg-dark-2 dark:focus:border-primary"
            placeholder="End Date"
          />
          <button
            onClick={handleGenerateBill}
            className="hover:bg-dark-1 flex items-center gap-2 whitespace-nowrap rounded-md bg-dark-2 px-4 py-3 text-white"
          >
            <TbReceipt /> Generate Bill
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-10">
        <div className="rounded-[10px] border border-stroke bg-white shadow-1 dark:border-dark-3 dark:bg-gray-dark dark:shadow-card">
          <div className="p-4">
            {/* Filters */}
            <div className="mb-6 flex flex-col gap-4 md:flex-row">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by Site Name or Email"
                  className="w-full rounded-[7px] border-[1.5px] border-stroke bg-transparent px-5 py-3 text-dark outline-none transition placeholder:text-dark-6 focus:border-primary active:border-primary disabled:cursor-default dark:border-dark-3 dark:bg-dark-2 dark:text-white dark:focus:border-primary"
                />
                <AiOutlineSearch className="absolute right-3 top-1/2 -translate-y-1/2 transform text-dark-6 dark:text-white" />
              </div>
              <div className="flex gap-4">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="rounded-[7px] border-[1.5px] border-stroke bg-transparent px-5 py-3 text-dark outline-none transition focus:border-primary active:border-primary dark:border-dark-3 dark:bg-dark-2 dark:text-white"
                >
                  <option value="">Status: All</option>
                  <option value="Paid">Paid</option>
                  <option value="Pending">Pending</option>
                </select>
                {/* <select
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value)}
                  className="rounded-[7px] border-[1.5px] border-stroke bg-transparent px-5 py-3 text-dark outline-none transition focus:border-primary active:border-primary dark:border-dark-3 dark:bg-dark-2 dark:text-white"
                >
                  <option value="">Date Range</option>
                  <option value="this-month">This Month</option>
                  <option value="last-month">Last Month</option>
                  <option value="custom">Custom Range</option>
                </select> */}
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

            {/* Loading and Error States */}
            {loading && (
              <div className="py-4 text-center">
                <p className="text-gray-500">Loading customers...</p>
              </div>
            )}

            {error && (
              <div className="py-4 text-center">
                <p className="text-red-500">{error}</p>
              </div>
            )}

            {/* Bills Table */}
            <div className="rounded-[10px] border border-stroke bg-white shadow-1 dark:border-dark-3 dark:bg-gray-dark">
              <div className="max-w-full overflow-x-auto">
                <table className="w-full table-auto">
                  <thead>
                    <tr className="border-b border-stroke bg-gray-2 dark:border-dark-3 dark:bg-dark-2">
                      <th className="whitespace-nowrap px-6 py-4 text-left text-sm font-medium text-dark dark:text-white">
                        <input
                          type="checkbox"
                          onChange={handleSelectAll}
                          checked={
                            selectedCustomers.length === customers.length &&
                            customers.length > 0
                          }
                          className="custom-checkbox text-white"
                        />
                      </th>
                      <th className="whitespace-nowrap px-6 py-4 text-left text-sm font-medium text-dark dark:text-white">
                        Site Name
                      </th>
                      {/* Existing columns */}
                      <th className="whitespace-nowrap px-6 py-4 text-left text-sm font-medium text-dark dark:text-white">
                        Start Date
                      </th>
                      <th className="whitespace-nowrap px-6 py-4 text-left text-sm font-medium text-dark dark:text-white">
                        End Date
                      </th>
                      <th className="whitespace-nowrap px-6 py-4 text-left text-sm font-medium text-dark dark:text-white">
                        Email
                      </th>
                      <th className="whitespace-nowrap px-6 py-4 text-left text-sm font-medium text-dark dark:text-white">
                        Site ID
                      </th>
                      <th className="whitespace-nowrap px-6 py-4 text-left text-sm font-medium text-dark dark:text-white">
                        Price Cap
                      </th>
                      <th className="whitespace-nowrap px-6 py-4 text-left text-sm font-medium text-dark dark:text-white">
                        Production KWH
                      </th>
                      <th className="whitespace-nowrap px-6 py-4 text-left text-sm font-medium text-dark dark:text-white">
                        Self Cons. KWH
                      </th>
                      <th className="whitespace-nowrap px-6 py-4 text-left text-sm font-medium text-dark dark:text-white">
                        Consump. KWH
                      </th>
                      <th className="whitespace-nowrap px-6 py-4 text-left text-sm font-medium text-dark dark:text-white">
                        Export KWH
                      </th>
                      <th className="whitespace-nowrap px-6 py-4 text-left text-sm font-medium text-dark dark:text-white">
                        Belco Price
                      </th>
                      <th className="whitespace-nowrap px-6 py-4 text-left text-sm font-medium text-dark dark:text-white">
                        Effective Price
                      </th>
                      <th className="whitespace-nowrap px-6 py-4 text-left text-sm font-medium text-dark dark:text-white">
                        Bill Period
                      </th>
                      <th className="whitespace-nowrap px-6 py-4 text-left text-sm font-medium text-dark dark:text-white">
                        Ex. Days
                      </th>
                      <th className="whitespace-nowrap px-6 py-4 text-left text-sm font-medium text-dark dark:text-white">
                        Savings
                      </th>
                      <th className="whitespace-nowrap px-6 py-4 text-left text-sm font-medium text-dark dark:text-white">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {customers.map((customer) => (
                      <tr
                        key={customer.id}
                        className="border-b border-stroke dark:border-dark-3"
                      >
                        <td className="whitespace-nowrap px-6 py-4 text-sm dark:text-white">
                          <input
                            type="checkbox"
                            checked={selectedCustomers.includes(customer.id)}
                            onChange={() => handleSelectCustomer(customer.id)}
                            className="custom-checkbox text-white"
                          />
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm dark:text-white">
                          {customer.site_name}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm dark:text-white">
                          {startDate}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm dark:text-white">
                          {endDate}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm dark:text-white">
                          {customer.email}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm dark:text-white">
                          {customer.site_id}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm dark:text-white">
                          {customer.price_cap}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm dark:text-white">
                          {customer.production_kwh}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm dark:text-white">
                          {customer.self_cons_kwh}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm dark:text-white">
                          {customer.consump_kwh}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm dark:text-white">
                          {customer.export_kwh}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm dark:text-white">
                          {customer.belco_price}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm dark:text-white">
                          {customer.effective_price}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm dark:text-white">
                          {customer.bill_period}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm dark:text-white">
                          {customer.ex_days}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm dark:text-white">
                          {customer.savings}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-sm font-medium ${
                              customer.status === "Paid"
                                ? "bg-success/10 text-success"
                                : "bg-warning/10 text-warning"
                            }`}
                          >
                            {customer.status}
                          </span>
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
                    Showing 1 to {customers.length} of {customers.length}{" "}
                    results
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    className="rounded-[7px] border-[1.5px] border-stroke bg-transparent px-4 py-2 text-sm text-dark transition hover:bg-gray-200 disabled:opacity-50 dark:border-dark-3 dark:bg-dark-2 dark:text-white dark:hover:bg-dark-3"
                    disabled
                  >
                    <FaArrowLeft /> Previous
                  </button>
                  <button
                    className="rounded-[7px] border-[1.5px] border-stroke bg-transparent px-4 py-2 text-sm text-dark transition hover:bg-gray-200 disabled:opacity-50 dark:border-dark-3 dark:bg-dark-2 dark:text-white dark:hover:bg-dark-3"
                    disabled
                  >
                    Next <FaArrowRight />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bill Generation Modal */}
      {showBillModal && (
        <Dialog open={showBillModal} onOpenChange={setShowBillModal}>
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-3/50 backdrop-blur-sm" onClick={() => setShowBillModal(false)}>
            <div className="max-h-[80vh] w-2/3 overflow-y-auto rounded-lg bg-white p-8 shadow-xl dark:bg-gray-dark" onClick={(e) => e.stopPropagation()}>
              <h2 className="mb-6 text-center text-2xl font-bold">
                Generated Bill
              </h2>

              {selectedCustomers.map((customerId) => {
                const customer = customers.find((c) => c.id === customerId);
                return (
                  <div
                    key={customerId}
                    className="mb-8 rounded-lg border border-gray-200 bg-gray-50/50 p-6"
                  >
                    {/* Header */}
                    <div className="mb-4 border-b pb-4">
                      <h3 className="text-lg font-semibold text-gray-700">
                        {customer?.site_name}
                      </h3>
                      <p className="text-sm text-gray-500">
                        Billing Period: {startDate} to {endDate}
                      </p>
                    </div>

                    {/* Invoice Details */}
                    <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                      <div>
                        <p>
                          <strong>Site ID:</strong> {customer?.site_id}
                        </p>
                        <p>
                          <strong>Production KWH:</strong>{" "}
                          {customer?.production_kwh}
                        </p>
                        <p>
                          <strong>Self Consumption KWH:</strong>{" "}
                          {customer?.self_cons_kwh}
                        </p>
                        <p>
                          <strong>Export KWH:</strong> {customer?.export_kwh}
                        </p>
                      </div>
                      <div>
                        <p>
                          <strong>Effective Price:</strong>{" "}
                          {customer?.effective_price}
                        </p>
                        <p>
                          <strong>Savings:</strong> {customer?.savings}
                        </p>
                        <p>
                          <strong>Status:</strong>{" "}
                          <span
                            className={`font-semibold ${
                              customer?.status === "Paid"
                                ? "text-green-600"
                                : "text-red-600"
                            }`}
                          >
                            {customer?.status}
                          </span>
                        </p>
                      </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="mt-6 flex justify-between">
                      <div className="text-sm text-gray-500">
                        <p>Generated on: {new Date().toLocaleDateString()}</p>
                      </div>
                      <div className="flex gap-2">
                        <button className="rounded bg-green-200 px-4 py-2 font-medium text-gray-800 hover:bg-green-300">
                          Post Bill
                        </button>
                        <button className="rounded bg-dark-2 px-4 py-2 text-white hover:bg-dark">
                          Download PDF
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Modal Actions */}
              <div className="mt-6 flex justify-end gap-4">
                <button
                  onClick={() => setShowBillModal(false)}
                  className="rounded bg-gray-3 px-4 py-2 text-dark-2 hover:bg-gray-4"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    // Add print functionality here
                    window.print();
                  }}
                  className="rounded bg-primary px-4 py-2 text-white hover:bg-primary/90"
                >
                  Print Bill
                </button>
              </div>
            </div>
          </div>
        </Dialog>
      )}
    </>
  );
};

export default CustomersListTable;
