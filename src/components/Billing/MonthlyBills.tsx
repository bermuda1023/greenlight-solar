"use client";
import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "@/utils/supabase/browserClient";
import ViewBillModal from "./ViewBillModal";
import { FaRegFilePdf, FaRegTrashAlt } from "react-icons/fa";
import { LiaFileInvoiceDollarSolid } from "react-icons/lia";
import TransactionsModal from "./TransactionsModal";
import { useSearchParams } from "next/navigation";
import { toast } from "react-toastify";
interface Bill {
  id: string;
  customer_id: string;
  site_name: string;
  email: string;
  address: string;
  billing_period_start: string;
  billing_period_end: string;
  production_kwh: number;
  self_consumption_kwh: number;
  export_kwh: number;
  effective_rate?: number; // New field
  total_revenue: number;
  total_bill: number;
  total_production?: number; // New field
  status: string;
  created_at: string;
  invoice_number: string;
  reconciliation_ids: string[] | null;
  interest?: number;
  pending_bill?: number;
  paid_amount?: number;
  last_overdue?: number;
}

interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  total_bill: number;
  paid_amount: number;
  pending_amount: number;
  status: string;
  created_at: string;
  bill_id: string;
}

interface Parameters {
  id: string;
  fuelRate: number;
  feedInPrice: number;
  basePrice: number;
  message: string;
}

const BillingScreen = () => {
  const [bills, setBills] = useState<Bill[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dateRange, setDateRange] = useState("");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [openbillModal, setOpenBillModal] = useState(false);

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isTransactionsModalOpen, setIsTransactionsModalOpen] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const searchParams = useSearchParams();
  const highlightId = searchParams?.get("highlightId");

  useEffect(() => {
    if (highlightId) {
      const element = document.getElementById(`transaction-${highlightId}`);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "center" });
        element.classList.add("bg-primary/0.1"); // Add a highlight class
        setTimeout(() => {
          element.classList.remove("bg-primary/0.1");
        }, 3000); // Remove highlight after 3 seconds
      }
    }
  }, [highlightId]);

  const fetchBills = useCallback(async () => {
    try {
      setLoading(true);
      let query = supabase
        .from("monthly_bills")
        .select("*")
        .order("created_at", { ascending: false });

      // Apply filters
      if (searchTerm) {
        query = query.or(
          `site_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`,
        );
      }

      if (statusFilter) {
        query = query.eq("status", statusFilter);
      }

      if (dateRange) {
        const now = new Date();
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastDayOfMonth = new Date(
          now.getFullYear(),
          now.getMonth() + 1,
          0,
        );

        if (dateRange === "this-month") {
          query = query
            .gte("billing_period_start", firstDayOfMonth.toISOString())
            .lte("billing_period_end", lastDayOfMonth.toISOString());
        } else if (dateRange === "last-month") {
          const firstDayLastMonth = new Date(
            now.getFullYear(),
            now.getMonth() - 1,
            1,
          );
          const lastDayLastMonth = new Date(
            now.getFullYear(),
            now.getMonth(),
            0,
          );
          query = query
            .gte("billing_period_start", firstDayLastMonth.toISOString())
            .lte("billing_period_end", lastDayLastMonth.toISOString());
        } else if (dateRange === "custom" && customStartDate && customEndDate) {
          // Custom date range filter
          const startDate = new Date(customStartDate);
          const endDate = new Date(customEndDate);

          // Set time to start of day for start date and end of day for end date
          startDate.setHours(0, 0, 0, 0);
          endDate.setHours(23, 59, 59, 999);

          query = query
            .gte("billing_period_start", startDate.toISOString())
            .lte("billing_period_end", endDate.toISOString());
        }
      }

      const { data, error } = await query;
      console.log("Bill data:", data);
      if (error) throw error;
      setBills(data || []);
    } catch (err) {
      console.error("Error fetching bills:", err);
      setError("Failed to fetch bills. Please try again later.");
    } finally {
      setLoading(false);
    }
  }, [searchTerm, statusFilter, dateRange, customStartDate, customEndDate]);

  useEffect(() => {
    fetchBills();
  }, [fetchBills]);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, dateRange, customStartDate, customEndDate]);

  // Pagination calculations
  const totalPages = Math.ceil(bills.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedBills = bills.slice(startIndex, endIndex);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1); // Reset to first page when changing items per page
  };

  const formatBillingPeriod = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    return `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`;
  };

  const handleClearFilters = () => {
    setSearchTerm("");
    setStatusFilter("");
    setDateRange("");
    setCustomStartDate("");
    setCustomEndDate("");
  };

  const getActiveDateRangeText = () => {
    if (!dateRange) return null;

    if (dateRange === "this-month") {
      const now = new Date();
      return `This Month (${now.toLocaleString('default', { month: 'long', year: 'numeric' })})`;
    } else if (dateRange === "last-month") {
      const lastMonth = new Date();
      lastMonth.setMonth(lastMonth.getMonth() - 1);
      return `Last Month (${lastMonth.toLocaleString('default', { month: 'long', year: 'numeric' })})`;
    } else if (dateRange === "custom" && customStartDate && customEndDate) {
      const start = new Date(customStartDate);
      const end = new Date(customEndDate);
      return `Custom Range: ${start.toLocaleDateString()} - ${end.toLocaleDateString()}`;
    }
    return null;
  };

  const handleViewTransactions = async (billId: string) => {
    const bill = bills.find((b) => b.id === billId);

    if (!bill) {
      alert("Bill not found.");
      return;
    }

    try {
      // Fetch all transactions that have this billId in their reconciliation_ids array
      const { data: transactions, error: transactionsError } = await supabase
        .from("transactions")
        .select("*")
        .in("id", bill.reconciliation_ids || [])
        .order("date", { ascending: false });

      if (transactionsError) throw transactionsError;

      setTransactions(transactions);
      setSelectedBill(bill); // Store the selected bill to pass billId to modal
      setIsTransactionsModalOpen(true);
    } catch (err) {
      console.error("Error fetching transactions:", err);
      alert("Failed to fetch transactions. Please try again.");
    }
  };

  const handleDeleteBill = async (billId: string) => {
    try {
      // First, fetch the bill details to get the total_bill amount
      const { data: billData, error: billFetchError } = await supabase
        .from("monthly_bills")
        .select("customer_id, total_bill, total_revenue")
        .eq("id", billId)
        .single();

      if (billFetchError) {
        throw billFetchError;
      }

      const billcustomer = billData.customer_id;
      // Use total_bill if available, otherwise fall back to total_revenue
      const billAmount = billData.total_bill || billData.total_revenue;

      // Fetch the current_balance from the customer_balances table
      const { data: customerBalanceData, error: fetchError } = await supabase
        .from("customer_balances")
        .select("current_balance,total_billed")
        .eq("customer_id", billcustomer)
        .single();

      if (fetchError) {
        throw fetchError;
      }

      // Calculate the new balance by subtracting the bill amount from the current balance
      const newBalance = customerBalanceData.current_balance - billAmount;
      const newBalancetotal = customerBalanceData.total_billed - billAmount;

      // Update the customer balance with the new calculated balance
      const { error: updateError } = await supabase
        .from("customer_balances")
        .update({ current_balance: newBalance, total_billed: newBalancetotal })
        .eq("customer_id", billcustomer);

      if (updateError) {
        throw updateError;
      }

      // Now, delete the bill from the monthly_bills table
      const { error: deleteError } = await supabase
        .from("monthly_bills")
        .delete()
        .eq("id", billId);

      if (deleteError) throw deleteError;

      // Update the state to remove the deleted bill from the UI
      setBills((prevBills) => prevBills.filter((bill) => bill.id !== billId));

      // Show success messages
      toast.dismiss();
      toast.success("Bill deleted successfully and balance updated.");
    } catch (err) {
      console.error("Error deleting bill:", err);
      toast.error("Failed to delete the bill. Please try again.");
    }
  };

  const handleOpenBillModal = (bill: Bill) => {
    setSelectedBill(bill);
    setOpenBillModal(true);
  };


  const fetchParameters = useCallback(async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from("parameters")
          .select("*");
        if (fetchError) throw fetchError;
        console.log("Fetched parameters:", data);
        setParameters(data || []);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Error fetching parameters",
        );
      }
    }, []);

    const [parameters, setParameters] = useState<Parameters[]>([]);

    useEffect(() => {
        fetchParameters();
      }, [fetchParameters]);

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
      </div>

      <div className="flex flex-col gap-10">
        <div className="rounded-[10px] border border-stroke bg-white shadow-1 dark:border-dark-3 dark:bg-gray-dark dark:shadow-card">
          <div className="p-4">
            {/* Filters */}
            <div className="mb-6 flex flex-col gap-4">
              <div className="flex flex-col gap-4 md:flex-row">
                <div className="flex-1">
                  <div className="relative">
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search by Site Name or Email"
                      className="w-full rounded-[7px] border-[1.5px] border-stroke bg-transparent px-5 py-3 text-dark outline-none transition placeholder:text-dark-6 focus:border-primary active:border-primary disabled:cursor-default dark:border-dark-3 dark:bg-dark-2 dark:text-white dark:focus:border-primary"
                    />
                  </div>
                </div>
                <div className="relative">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full appearance-none rounded-[7px] border-[1.5px] border-stroke bg-transparent pl-5 pr-10 py-3 text-dark outline-none transition focus:border-primary active:border-primary dark:border-dark-3 dark:bg-dark-2 dark:text-white cursor-pointer hover:border-primary"
                    style={{ minWidth: '160px' }}
                  >
                    <option value="">Status: All</option>
                    <option value="Paid">Paid</option>
                    <option value="Pending">Pending</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                    <svg className="h-4 w-4 text-dark dark:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
                <div className="relative">
                  <select
                    value={dateRange}
                    onChange={(e) => {
                      setDateRange(e.target.value);
                      if (e.target.value !== "custom") {
                        setCustomStartDate("");
                        setCustomEndDate("");
                      }
                    }}
                    className="w-full appearance-none rounded-[7px] border-[1.5px] border-stroke bg-transparent pl-5 pr-10 py-3 text-dark outline-none transition focus:border-primary active:border-primary dark:border-dark-3 dark:bg-dark-2 dark:text-white cursor-pointer hover:border-primary"
                    style={{ minWidth: '180px' }}
                  >
                    <option value="">Date Range: All</option>
                    <option value="this-month">This Month</option>
                    <option value="last-month">Last Month</option>
                    <option value="custom">Custom Range</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                    <svg className="h-4 w-4 text-dark dark:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Custom Date Range Inputs */}
              {dateRange === "custom" && (
                <div className="flex flex-col gap-4 md:flex-row md:items-center">
                  <div className="flex-1">
                    <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      className="w-full rounded-[7px] border-[1.5px] border-stroke bg-transparent px-5 py-3 text-dark outline-none transition focus:border-primary active:border-primary dark:border-dark-3 dark:bg-dark-2 dark:text-white"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      className="w-full rounded-[7px] border-[1.5px] border-stroke bg-transparent px-5 py-3 text-dark outline-none transition focus:border-primary active:border-primary dark:border-dark-3 dark:bg-dark-2 dark:text-white"
                    />
                  </div>
                </div>
              )}

              {/* Active Filters Status */}
              {(searchTerm || statusFilter || dateRange) && (
                <div className="flex items-center justify-between rounded-lg bg-primary/10 p-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-sm font-semibold text-dark dark:text-white">
                      Active Filters:
                    </span>
                    {searchTerm && (
                      <span className="inline-flex items-center gap-2 rounded-full bg-primary px-3 py-1 text-sm text-white">
                        Search: "{searchTerm}"
                      </span>
                    )}
                    {statusFilter && (
                      <span className="inline-flex items-center gap-2 rounded-full bg-primary px-3 py-1 text-sm text-white">
                        Status: {statusFilter}
                      </span>
                    )}
                    {getActiveDateRangeText() && (
                      <span className="inline-flex items-center gap-2 rounded-full bg-primary px-3 py-1 text-sm text-white">
                        {getActiveDateRangeText()}
                      </span>
                    )}
                    <span className="text-sm text-dark-6 dark:text-dark-6">
                      ({bills.length} {bills.length === 1 ? 'result' : 'results'})
                    </span>
                  </div>
                  <button
                    onClick={handleClearFilters}
                    className="rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-600"
                  >
                    Clear All Filters
                  </button>
                </div>
              )}
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-danger/10 text-danger mb-4 rounded-md p-4">
                {error}
              </div>
            )}

            {/* Loading State */}
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
              </div>
            ) : (
              /* Bills Table */
              <div className="rounded-[10px] border border-stroke bg-white shadow-1 dark:border-dark-3 dark:bg-gray-dark">
                <div className="max-w-full overflow-x-auto">
                  <table className="w-full table-auto">
                    <thead>
                      <tr className="border-b border-stroke bg-gray-2 dark:border-dark-3 dark:bg-dark-2">
                        <th className="px-6.5 py-4 text-left text-sm font-medium text-dark dark:text-white">
                          Site Name
                        </th>
                        <th className="px-6.5 py-4 text-left text-sm font-medium text-dark dark:text-white">
                          Email
                        </th>
                        <th className="px-6.5 py-4 text-left text-sm font-medium text-dark dark:text-white">
                          Address
                        </th>
                        <th className="px-6.5 py-4 text-left text-sm font-medium text-dark dark:text-white">
                          Billing Period
                        </th>

                        <th className="px-6.5 py-4 text-left text-sm font-medium text-dark dark:text-white">
                          Total Production (kWh)
                        </th>

                        <th className="px-6.5 py-4 text-left text-sm font-medium text-dark dark:text-white">
                          Effective Rate (¢/kWh)
                        </th>
                        <th className="px-6.5 py-4 text-left text-sm font-medium text-dark dark:text-white">
                          Total Revenue ($)
                        </th>

                        <th className="px-6.5 py-4 text-left text-sm font-medium text-dark dark:text-white">
                          Total Bill ($)
                        </th>

                        <th className="px-6.5 py-4 text-left text-sm font-medium text-dark dark:text-white">
                          Balance Overdue ($)
                        </th>

                        <th className="px-6.5 py-4 text-left text-sm font-medium text-dark dark:text-white">
                          Status
                        </th>
                        <th className="px-6.5 py-4 text-left text-sm font-medium text-dark dark:text-white">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedBills.length === 0 ? (
                        <tr>
                          <td colSpan={11} className="px-6.5 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                            No bills found matching your criteria.
                          </td>
                        </tr>
                      ) : (
                        paginatedBills.map((bill) => (
                        <tr
                          id={`transaction-${bill.id}`}
                          key={bill.id}
                          className={`${bill.id === highlightId ? "bg-primary/[.1] transition-colors duration-1000" : "border-b border-stroke dark:border-dark-3"}`}
                        >
                          <td className="px-6.5 py-4 text-sm dark:text-white">
                            {bill.site_name}
                          </td>
                          <td className="px-6.5 py-4 text-sm dark:text-white">
                            {bill.email}
                          </td>
                          <td className="px-6.5 py-4 text-sm dark:text-white">
                            {bill.address}
                          </td>
                          <td className="px-6.5 py-4 text-sm dark:text-white">
                            {formatBillingPeriod(
                              bill.billing_period_start,
                              bill.billing_period_end,
                            )}
                          </td>

                          <td className="px-6.5 py-4 text-sm dark:text-white">
                            {bill.total_production}
                          </td>

                          <td className="px-6.5 py-4 text-sm dark:text-white">
                            {bill.effective_rate}¢
                          </td>
                          <td className="px-6.5 py-4 text-sm dark:text-white">
                            ${bill.total_revenue.toFixed(2)}
                          </td>

                          <td className="px-6.5 py-4 text-sm font-semibold dark:text-white">
                            ${(bill.total_bill || bill.total_revenue).toFixed(2)}
                          </td>

                          <td className="px-6.5 py-4 text-sm dark:text-white">
                            <span className={`font-semibold ${(bill.last_overdue || 0) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                              ${(bill.last_overdue || 0).toFixed(2)}
                            </span>
                          </td>

                          <td className="px-6.5 py-4 text-sm dark:text-white">
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
                          <td className="flex justify-end space-x-3 px-6.5 py-4 text-sm dark:text-white">
                            {bill.reconciliation_ids &&
                              bill.reconciliation_ids.length > 0 && (
                                <button
                                  onClick={() =>
                                    handleViewTransactions(bill.id)
                                  }
                                  className="hover:text-dark- rounded-lg bg-gray-50 p-2 text-dark-3 transition hover:bg-gray-200"
                                  title="View Transactions"
                                >
                                  <span className="text-xl">
                                    <LiaFileInvoiceDollarSolid />
                                  </span>
                                </button>
                              )}
                            <button
                              key={bill.id}
                              onClick={() => handleOpenBillModal(bill)}
                              className="rounded-lg bg-green-50 p-2 text-primary transition hover:bg-primary hover:text-green-50"
                            >
                              <span className="text-xl">
                                <FaRegFilePdf />
                              </span>
                            </button>
                            <button
                              onClick={() => handleDeleteBill(bill.id)}
                              className="rounded-lg bg-red-50 p-2 text-red-600 transition hover:bg-red-600 hover:text-red-50"
                            >
                              <span className="text-xl">
                                <FaRegTrashAlt />
                              </span>
                            </button>
                          </td>
                          {openbillModal && selectedBill && (
                            <ViewBillModal
                              closeModal={() => setOpenBillModal(false)}
                              bill={selectedBill}
                            />
                          )}
                        </tr>
                      ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Controls */}
                {!loading && bills.length > 0 && (
                  <div className="flex flex-col gap-4 border-t border-stroke p-4 dark:border-dark-3 sm:flex-row sm:items-center sm:justify-between">
                    {/* Items per page selector */}
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-dark dark:text-white">
                        Show:
                      </span>
                      <select
                        value={itemsPerPage}
                        onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
                        className="rounded-[7px] border-[1.5px] border-stroke bg-transparent px-3 py-2 text-sm text-dark outline-none transition focus:border-primary active:border-primary dark:border-dark-3 dark:bg-dark-2 dark:text-white"
                      >
                        <option value={10}>10 per page</option>
                        <option value={25}>25 per page</option>
                        <option value={50}>50 per page</option>
                      </select>
                    </div>

                    {/* Pagination info */}
                    <div className="text-sm text-dark dark:text-white">
                      Showing {startIndex + 1} to {Math.min(endIndex, bills.length)} of {bills.length} entries
                    </div>

                    {/* Page navigation */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="rounded-[7px] border-[1.5px] border-stroke bg-transparent px-4 py-2 text-sm text-dark transition hover:bg-gray-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-dark-3 dark:text-white dark:hover:bg-dark-2"
                      >
                        Previous
                      </button>

                      {/* Page numbers */}
                      <div className="flex items-center gap-1">
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          let pageNumber: number;
                          if (totalPages <= 5) {
                            pageNumber = i + 1;
                          } else if (currentPage <= 3) {
                            pageNumber = i + 1;
                          } else if (currentPage >= totalPages - 2) {
                            pageNumber = totalPages - 4 + i;
                          } else {
                            pageNumber = currentPage - 2 + i;
                          }

                          return (
                            <button
                              key={pageNumber}
                              onClick={() => handlePageChange(pageNumber)}
                              className={`h-9 w-9 rounded-[7px] text-sm transition ${
                                currentPage === pageNumber
                                  ? "bg-primary text-white"
                                  : "border-[1.5px] border-stroke bg-transparent text-dark hover:bg-gray-2 dark:border-dark-3 dark:text-white dark:hover:bg-dark-2"
                              }`}
                            >
                              {pageNumber}
                            </button>
                          );
                        })}
                      </div>

                      <button
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="rounded-[7px] border-[1.5px] border-stroke bg-transparent px-4 py-2 text-sm text-dark transition hover:bg-gray-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-dark-3 dark:text-white dark:hover:bg-dark-2"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      {isTransactionsModalOpen && selectedBill && (
        <TransactionsModal
          isOpen={isTransactionsModalOpen}
          onClose={() => setIsTransactionsModalOpen(false)}
          transactions={transactions}
          billId={selectedBill.id}
        />
      )}
    </>
  );
};

export default BillingScreen;