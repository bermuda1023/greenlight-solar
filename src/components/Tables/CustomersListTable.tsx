"use client";

import { useRouter } from "next/navigation";
import React, { useState, useEffect } from "react";
import { FaPlus, FaArrowLeft, FaArrowRight } from "react-icons/fa";
import { AiOutlineSearch } from "react-icons/ai";
import { TbReceipt } from "react-icons/tb";
import flatpickr from "flatpickr";
import { supabase } from "@/utils/supabase/browserClient";

// Type definition matching your insert operation schema
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
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dateRange, setDateRange] = useState("");
  const [siteCapacity, setSiteCapacity] = useState("");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);

  const router = useRouter();

  useEffect(() => {
    flatpickr(".form-datepicker", {
      mode: "single",
      static: true,
      monthSelectorType: "static",
      dateFormat: "M j, Y",
      prevArrow:
        '<svg class="fill-current" width="7" height="11" viewBox="0 0 7 11"><path d="M5.4 10.8l1.4-1.4-4-4 4-4L5.4 0 0 5.4z" /></svg>',
      nextArrow:
        '<svg class="fill-current" width="7" height="11" viewBox="0 0 7 11"><path d="M1.4 10.8L0 9.4l4-4-4-4L1.4 0l5.4 5.4z" /></svg>',
    });
  }, []);

  useEffect(() => {
    fetchCustomers();
  }, [searchTerm, statusFilter, dateRange, siteCapacity, currentPage, pageSize]);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      
      // First, get total count for pagination
      const countQuery = supabase
        .from('customers')
        .select('*', { count: 'exact' });

      if (searchTerm) {
        countQuery.or(`site_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`);
      }

      if (statusFilter) {
        countQuery.eq('status', statusFilter);
      }

      const { count } = await countQuery;
      setTotalCount(count || 0);

      // Then fetch paginated data
      let query = supabase
        .from('customers')
        .select('*')
        .range((currentPage - 1) * pageSize, currentPage * pageSize - 1)
        .order('created_at', { ascending: false });

      if (searchTerm) {
        query = query.or(`site_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`);
      }

      if (statusFilter) {
        query = query.eq('status', statusFilter);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;
      console.log("Customers Data", query);

      setCustomers(data || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while fetching customers');
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setCurrentPage(1); // Reset to first page when changing page size
  };

  const handleAddCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    router.push("/dashboard/customers/add");
  };

  // Calculate pagination values
  const totalPages = Math.ceil(totalCount / pageSize);
  const startIndex = (currentPage - 1) * pageSize + 1;
  const endIndex = Math.min(currentPage * pageSize, totalCount);

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
            className="form-datepicker w-full rounded-[7px] border-[1.5px] bg-white border-stroke bg-transparent px-5 py-3 font-normal outline-none transition focus:border-primary active:border-primary dark:border-dark-3 dark:bg-dark-2 dark:focus:border-primary"
            placeholder="Start Date"
          />
          <input
            className="form-datepicker w-full rounded-[7px] border-[1.5px] bg-white border-stroke bg-transparent px-5 py-3 font-normal outline-none transition focus:border-primary active:border-primary dark:border-dark-3 dark:bg-dark-2 dark:focus:border-primary"
            placeholder="End Date"
          />
          <button className="hover:bg-dark-1 flex items-center gap-2 rounded-md bg-dark-2 px-4 py-3 text-white whitespace-nowrap">
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

            {/* Loading and Error States */}
            {loading && (
              <div className="text-center py-4">
                <p className="text-gray-500">Loading customers...</p>
              </div>
            )}

            {error && (
              <div className="text-center py-4">
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
                        Site Name
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
                          {customer.site_name}
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
                    Showing 1 to {customers.length} of {customers.length} results
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
    </>
  );
};

export default CustomersListTable;
