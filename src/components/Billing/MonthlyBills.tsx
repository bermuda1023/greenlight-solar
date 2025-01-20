"use client";
import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "@/utils/supabase/browserClient";
import ViewBillModal from "./ViewBillModal";
import { FaRegFilePdf, FaRegTrashAlt } from "react-icons/fa";
import { useRouter, useSearchParams } from "next/navigation";
import { LiaFileInvoiceDollarSolid } from "react-icons/lia";
import TransactionsModal from "./TransactionsModal";

interface Bill {
  id: string;
  site_name: string;
  email: string;
  address: string;
  billing_period_start: string;
  billing_period_end: string;
  production_kwh: number;
  self_consumption_kwh: number;
  export_kwh: number;
  total_cost: number;
  energy_rate: number;
  total_revenue: number;
  total_bill: number;
  status: string;
  created_at: string;
  arrears: number;
  invoice_number: string;
  reconciliation_ids: string[] | null;
}

interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  paid_amount: number;
  pending_amount: number;
  status: string;
  created_at: string;
  bill_id: string;
}

const BillingScreen = () => {
  const [bills, setBills] = useState<Bill[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dateRange, setDateRange] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [openbillModal, setOpenBillModal] = useState(false);

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isTransactionsModalOpen, setIsTransactionsModalOpen] = useState(false);

  const searchParams = useSearchParams();
  const highlightId = searchParams.get("highlightId");

  const router = useRouter();

  const closeModal = () => {
    setOpenBillModal(false);
  };

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
        }
      }

      const { data, error } = await query;

      if (error) throw error;
      setBills(data || []);
    } catch (err) {
      console.error("Error fetching bills:", err);
      setError("Failed to fetch bills. Please try again later.");
    } finally {
      setLoading(false);
    }
  }, [searchTerm, statusFilter, dateRange]);

  useEffect(() => {
    fetchBills();
  }, [fetchBills]);

  const formatBillingPeriod = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    return `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`;
  };

  const handleViewTransactions = async (billId: string) => {
    const bill = bills.find((b) => b.id === billId);
  
    if (!bill) {
      alert("Bill not found.");
      return;
    }
  
    try {
      const { data: transactions, error: transactionsError } = await supabase
        .from("reconciliation")
        .select("*")
        .eq("bill_id", billId)
        .order("date", { ascending: false });
  
      if (transactionsError) throw transactionsError;
  
      // Add the total_bill to each transaction
      const enrichedTransactions = transactions.map((transaction) => ({
        ...transaction,
        total_bill: bill.total_bill,
      }));
  
      setTransactions(enrichedTransactions);
      setIsTransactionsModalOpen(true);
    } catch (err) {
      console.error("Error fetching transactions:", err);
      alert("Failed to fetch transactions. Please try again.");
    }
  };
  

  const handleDeleteBill = async (billId: string) => {
    try {
      const { error } = await supabase
        .from("monthly_bills")
        .delete()
        .eq("id", billId);

      if (error) throw error;

      // Update the state to remove the deleted bill from the UI
      setBills((prevBills) => prevBills.filter((bill) => bill.id !== billId));

      alert("Bill deleted successfully.");
    } catch (err) {
      console.error("Error deleting bill:", err);
      alert("Failed to delete the bill. Please try again.");
    }
  };

  const handleOpenBillModal = (bill: Bill) => {
    setSelectedBill(bill);
    setOpenBillModal(true);
  };

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
            <div className="mb-6 flex flex-col gap-4 md:flex-row">
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
              </select>
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
                          Total Cost ($)
                        </th>
                        <th className="px-6.5 py-4 text-left text-sm font-medium text-dark dark:text-white">
                          Energy Rate ($/kWh)
                        </th>
                        <th className="px-6.5 py-4 text-left text-sm font-medium text-dark dark:text-white">
                          Total Revenue ($)
                        </th>
                        <th className="px-6.5 py-4 text-left text-sm font-medium text-dark dark:text-white">
                          Total Bill ($)
                        </th>
                        <th className="px-6.5 py-4 text-left text-sm font-medium text-dark dark:text-white">
                          Outstanding ($)
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
                      {bills.map((bill) => (
                        <tr
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
                            ${bill.total_cost.toFixed(2)}
                          </td>
                          <td className="px-6.5 py-4 text-sm dark:text-white">
                            ${bill.energy_rate.toFixed(2)}
                          </td>
                          <td className="px-6.5 py-4 text-sm dark:text-white">
                            ${bill.total_revenue.toFixed(2)}
                          </td>
                          <td className="px-6.5 py-4 text-sm dark:text-white">
                            ${bill.total_bill.toFixed(2)}
                          </td>
                          <td className="px-6.5 py-4 text-sm dark:text-white">
                            ${bill.arrears.toFixed(2)}
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
                              title="Open Bill"
                            >
                              <span className="text-xl">
                                <FaRegFilePdf />
                              </span>
                            </button>
                            <button
                              onClick={() => handleDeleteBill(bill.id)}
                              className="rounded-lg bg-red-50 p-2 text-red-600 transition hover:bg-red-600 hover:text-red-50"
                              title="Delete Bill"
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
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      {isTransactionsModalOpen && (
        <TransactionsModal
          isOpen={isTransactionsModalOpen}
          onClose={() => setIsTransactionsModalOpen(false)}
          transactions={transactions}
        />
      )}
    </>
  );
};

export default BillingScreen;
