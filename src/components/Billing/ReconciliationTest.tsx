"use client";

import { supabase } from "@/utils/supabase/browserClient";
import { useRouter, useSearchParams } from "next/navigation";
import React, { useState, useEffect, useCallback, ChangeEvent } from "react";
import { IoMdCloudUpload } from "react-icons/io";
import { toast } from "react-toastify";
import { ReconciliationService } from "@/services/reconcile-service";

interface CSVRow {
  [key: string]: string;
}

interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  status: "Unmatched" | "Matched";
  customer_id?: string | null;
  customer_site_name?: string | null;
  reference_no?: string | null;
}

interface Customer {
  id: string;
  site_name: string;
  email: string;
  address: string;
}

interface CustomerBalance {
  customer_id: string;
  total_billed: number;
  total_paid: number;
  due_balance: number;
  wallet: number;
}

interface CustomerWithBalance extends Customer {
  balance: CustomerBalance;
}

interface ReconcileModalProps {
  transaction: Transaction;
  onClose: () => void;
  onReconcile: (transactionId: string, customerId: string) => Promise<void>;
}

const ReconcileModal: React.FC<ReconcileModalProps> = ({
  transaction,
  onClose,
  onReconcile,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [allCustomers, setAllCustomers] = useState<CustomerWithBalance[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<CustomerWithBalance[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerWithBalance | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch all customers on mount
  useEffect(() => {
    const fetchAllCustomers = async () => {
      setLoading(true);
      try {
        // Fetch all customers
        const { data: customersData, error: customersError } = await supabase
          .from("customers")
          .select("id, site_name, email, address")
          .order("site_name", { ascending: true });

        if (customersError) throw customersError;

        if (!customersData || customersData.length === 0) {
          setAllCustomers([]);
          setFilteredCustomers([]);
          return;
        }

        // Fetch balances for all customers
        const customerIds = customersData.map(c => c.id);
        const { data: balancesData, error: balancesError } = await supabase
          .from("customer_balances")
          .select("*")
          .in("customer_id", customerIds);

        if (balancesError) throw balancesError;

        // Combine customer data with balances
        const customersWithBalances: CustomerWithBalance[] = customersData.map(customer => {
          const balance = balancesData?.find(b => b.customer_id === customer.id);
          return {
            ...customer,
            balance: balance || {
              customer_id: customer.id,
              total_billed: 0,
              total_paid: 0,
              due_balance: 0,
              wallet: 0
            }
          };
        });

        setAllCustomers(customersWithBalances);
        setFilteredCustomers(customersWithBalances);
      } catch (error) {
        console.error("Error fetching customers:", error);
        toast.error("Error loading customers");
      } finally {
        setLoading(false);
      }
    };

    fetchAllCustomers();
  }, []);

  // Filter customers based on search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredCustomers(allCustomers);
      return;
    }

    const searchLower = searchTerm.toLowerCase();
    const filtered = allCustomers.filter(customer =>
      customer.site_name.toLowerCase().includes(searchLower) ||
      customer.email.toLowerCase().includes(searchLower)
    );

    setFilteredCustomers(filtered);
  }, [searchTerm, allCustomers]);

  const handleReconcile = async () => {
    if (!selectedCustomer) {
      toast.error("Please select a customer");
      return;
    }

    await onReconcile(transaction.id, selectedCustomer.id);
  };

  return (
    <div className="fixed inset-0 z-999 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="w-full max-w-[900px] max-h-[90vh] overflow-y-auto rounded-lg bg-white p-4 sm:p-6">
        <h2 className="mb-4 text-base sm:text-lg font-semibold">Match Transaction to Customer</h2>

        {/* Transaction Details */}
        <div className="mb-4 rounded-lg bg-gray-50 p-3 sm:p-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <div>
              <p className="text-xs sm:text-sm text-gray-600">Transaction Date</p>
              <p className="font-medium text-sm sm:text-base">{transaction.date}</p>
            </div>
            <div>
              <p className="text-xs sm:text-sm text-gray-600">Description</p>
              <p className="font-medium text-sm sm:text-base truncate">{transaction.description}</p>
            </div>
            <div>
              <p className="text-xs sm:text-sm text-gray-600">Amount</p>
              <p className="font-medium text-sm sm:text-base text-green-600">${transaction.amount.toFixed(2)}</p>
            </div>
          </div>
        </div>

        {/* Customer Search */}
        <div className="mb-4">
          <label className="block text-xs sm:text-sm font-medium mb-2">Search Customer</label>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by site name or email..."
            className="w-full rounded-lg border border-gray-300 px-3 sm:px-4 py-2 text-sm sm:text-base"
          />
        </div>

        {/* Customer Results */}
        {loading ? (
          <div className="mb-4 text-center py-8">
            <p className="text-gray-500">Loading customers...</p>
          </div>
        ) : filteredCustomers.length > 0 ? (
          <div className="mb-4">
            <h3 className="mb-2 text-sm sm:text-base font-semibold">Select Customer ({filteredCustomers.length} found)</h3>
            <div className="max-h-60 overflow-x-auto overflow-y-auto rounded border">
              <table className="w-full">
                <thead className="sticky top-0 bg-gray-50">
                  <tr>
                    <th className="px-2 sm:px-4 py-2 text-left text-xs sm:text-sm">Select</th>
                    <th className="px-2 sm:px-4 py-2 text-left text-xs sm:text-sm">Site Name</th>
                    <th className="px-2 sm:px-4 py-2 text-left text-xs sm:text-sm hidden md:table-cell">Email</th>
                    <th className="px-2 sm:px-4 py-2 text-left text-xs sm:text-sm">Due</th>
                    <th className="px-2 sm:px-4 py-2 text-left text-xs sm:text-sm">Wallet</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCustomers.map((customer) => (
                    <tr
                      key={customer.id}
                      className={`hover:bg-gray-50 cursor-pointer ${
                        selectedCustomer?.id === customer.id ? 'bg-blue-50' : ''
                      }`}
                      onClick={() => setSelectedCustomer(customer)}
                    >
                      <td className="px-2 sm:px-4 py-2">
                        <input
                          type="radio"
                          checked={selectedCustomer?.id === customer.id}
                          onChange={() => setSelectedCustomer(customer)}
                          className="cursor-pointer"
                        />
                      </td>
                      <td className="px-2 sm:px-4 py-2 text-xs sm:text-sm">{customer.site_name}</td>
                      <td className="px-2 sm:px-4 py-2 text-xs sm:text-sm hidden md:table-cell truncate max-w-[150px]">{customer.email}</td>
                      <td className="px-2 sm:px-4 py-2">
                        <span className={`text-xs sm:text-sm font-semibold ${
                          customer.balance.due_balance > 0 ? 'text-red-600' : 'text-gray-500'
                        }`}>
                          ${customer.balance.due_balance.toFixed(2)}
                        </span>
                      </td>
                      <td className="px-2 sm:px-4 py-2">
                        <span className={`text-xs sm:text-sm font-semibold ${
                          customer.balance.wallet > 0 ? 'text-green-600' : 'text-gray-500'
                        }`}>
                          ${customer.balance.wallet.toFixed(2)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="mb-4 text-center py-8">
            <p className="text-gray-500">No customers found</p>
          </div>
        )}

        {/* Selected Customer Preview */}
        {selectedCustomer && (
          <div className="mb-4 rounded-lg bg-blue-50 p-3 sm:p-4">
            <div className="mb-3">
              <p className="text-sm sm:text-base font-semibold">Selected: {selectedCustomer.site_name}</p>
              <p className="text-xs sm:text-sm text-gray-600 truncate">{selectedCustomer.email}</p>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:gap-4">
              <div>
                <label className="block text-xs sm:text-sm font-medium mb-1">Current Due Balance</label>
                <p className="rounded-lg border border-gray-300 px-3 sm:px-4 py-2 text-sm sm:text-base font-semibold text-red-600">
                  ${selectedCustomer.balance.due_balance.toFixed(2)}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg bg-gray-200 px-4 py-2 text-sm sm:text-base hover:bg-gray-300"
          >
            Cancel
          </button>
          <button
            onClick={handleReconcile}
            disabled={!selectedCustomer}
            className={`rounded-lg px-4 py-2 text-sm sm:text-base text-white ${
              selectedCustomer
                ? "bg-green-600 hover:bg-green-700"
                : "bg-gray-400 cursor-not-allowed"
            }`}
          >
            Match Transaction
          </button>
        </div>
      </div>
    </div>
  );
};

const Reconciliation = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [showReconcileModal, setShowReconcileModal] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("all");
  const [showMappingModal, setShowMappingModal] = useState(false);
  const [csvData, setCSVData] = useState<CSVRow[]>([]);

  // Search filter - single search bar
  const [searchQuery, setSearchQuery] = useState("");

  const router = useRouter();
  const searchParams = useSearchParams();
  const highlightId = searchParams?.get("highlightId");

  const fetchTransactions = useCallback(async () => {
    try {
      // Fetch transactions with customer site_name - sorted by created_at (latest first)
      const { data: transactionsData, error } = await supabase
        .from("transactions")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch customer names for matched transactions
      const transactionsWithCustomers = await Promise.all(
        (transactionsData || []).map(async (transaction) => {
          if (transaction.customer_id) {
            const { data: customerData } = await supabase
              .from("customers")
              .select("site_name")
              .eq("id", transaction.customer_id)
              .single();

            return {
              ...transaction,
              customer_site_name: customerData?.site_name || null
            };
          }
          return {
            ...transaction,
            customer_site_name: null
          };
        })
      );

      setTransactions(transactionsWithCustomers);
    } catch (error) {
      console.error("Error fetching transactions:", error);
      toast.error("Error fetching transactions");
    }
  }, []);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const handleReconcile = async (transactionId: string, customerId: string) => {
    try {
      // Get customer name for success message
      const { data: customerData } = await supabase
        .from("customers")
        .select("site_name")
        .eq("id", customerId)
        .single();

      const reconciliationService = new ReconciliationService();
      await reconciliationService.matchTransactionToCustomer(transactionId, customerId);

      const customerName = customerData?.site_name || "customer";
      toast.success(`Transaction matched successfully to ${customerName}!`);
      setShowReconcileModal(false);
      setSelectedTransaction(null);
      await fetchTransactions();
      router.push(`/dashboard/billing/reconciliation?highlightId=${transactionId}`);
    } catch (error) {
      console.error("Error reconciling transaction:", error);
      toast.error("Error matching transaction");
    }
  };


  const handleDelete = async (transactionId: string) => {
    const transaction = transactions.find(t => t.id === transactionId);
    if (!transaction) return;

    if (transaction.status !== "Unmatched") {
      toast.error("Can only delete unmatched transactions.");
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to delete this transaction?\n\nDescription: ${transaction.description}\nAmount: $${transaction.amount.toFixed(2)}`
    );

    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from("transactions")
        .delete()
        .eq("id", transactionId);

      if (error) throw error;

      toast.success("Transaction deleted successfully");
      await fetchTransactions();
    } catch (error) {
      console.error("Error deleting transaction:", error);
      toast.error("Error deleting transaction");
    }
  };

  // CSV Import Functions
  const cleanReferenceNumber = (refNo: string): string => {
    if (!refNo) return "";
    let cleaned = refNo.replace(/['"`]/g, "");
    cleaned = cleaned.trim();
    cleaned = cleaned.replace(/[^\w\-]/g, "");
    return cleaned;
  };

  const parseBankStatementDate = (dateStr: string): string => {
    const months: { [key: string]: number } = {
      'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
      'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
    };

    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const day = parseInt(parts[0]);
      const monthStr = parts[1];
      const year = parseInt(parts[2]) + 2000;

      const month = months[monthStr];
      if (month !== undefined) {
        const date = new Date(year, month, day);
        return date.toISOString().split('T')[0];
      }
    }
    return dateStr;
  };

  const parseCSV = (text: string) => {
    const lines = text.split("\n").filter((line) => line.trim());
    if (lines.length === 0) return;

    const dataLines = lines.slice(4);
    const data: CSVRow[] = [];

    dataLines.forEach((line) => {
      const hasTab = line.includes("\t");
      const delimiter = hasTab ? "\t" : ",";

      const values = line.split(delimiter).map((value) => {
        let cleaned = value.trim();
        if ((cleaned.startsWith("'") && cleaned.endsWith("'")) ||
            (cleaned.startsWith('"') && cleaned.endsWith('"'))) {
          cleaned = cleaned.slice(1, -1);
        }
        return cleaned;
      });

      const transactionDate = values[0] || "";
      const description = values[2] || "";
      const creditAmount = values[4] || "";
      const referenceNumber = values[6] || "";

      if (creditAmount && creditAmount !== "" && !isNaN(parseFloat(creditAmount)) && parseFloat(creditAmount) > 0) {
        const row: CSVRow = {
          "Date": transactionDate,
          "Description": description,
          "Amount": creditAmount,
          "ReferenceNo": cleanReferenceNumber(referenceNumber)
        };
        data.push(row);
      }
    });

    setCSVData(data);
  };

  const handleFileUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files[0] && files[0].type === "text/csv") {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        if (text) {
          parseCSV(text);
          setShowMappingModal(true);
        }
      };
      reader.readAsText(files[0]);
      event.target.value = "";
    } else {
      toast.error("Please upload a valid CSV file.");
    }
  };

  const handleMapping = async () => {
    try {
      const referenceNumbers = csvData
        .map(row => row["ReferenceNo"])
        .filter(ref => ref && ref.trim() !== "");

      if (referenceNumbers.length > 0) {
        const { data: existingTransactions, error: checkError } = await supabase
          .from("transactions")
          .select("reference_no, date, amount")
          .in("reference_no", referenceNumbers);

        if (checkError) throw checkError;

        if (existingTransactions && existingTransactions.length > 0) {
          const duplicateCount = existingTransactions.length;
          const duplicateRefs = existingTransactions
            .slice(0, 5)
            .map(t => t.reference_no)
            .join(", ");

          const moreText = duplicateCount > 5 ? ` and ${duplicateCount - 5} more` : "";

          toast.error(
            `Found ${duplicateCount} duplicate transaction${duplicateCount !== 1 ? 's' : ''} already in database. ` +
            `Reference numbers: ${duplicateRefs}${moreText}. Import cancelled to prevent duplicates.`,
            { autoClose: 8000 }
          );
          return;
        }
      }

      const processedData = csvData.map((row) => ({
        date: parseBankStatementDate(row["Date"]),
        description: row["Description"],
        amount: parseFloat(row["Amount"]),
        reference_no: row["ReferenceNo"] || null,
        status: "Unmatched",
      }));

      const { error } = await supabase
        .from("transactions")
        .insert(processedData);

      if (error) throw error;

      await fetchTransactions();
      setShowMappingModal(false);
      setCSVData([]);
      toast.success(`Successfully imported ${processedData.length} credit transactions`);
    } catch (error) {
      console.error("Error uploading transactions:", error);
      toast.error("Error saving transactions. Please try again.");
    }
  };

  const handleModalClose = () => {
    setShowMappingModal(false);
    setCSVData([]);
  };

  const MappingModal: React.FC<{
    onClose: () => void;
    onConfirm: () => void;
    csvData: CSVRow[];
  }> = ({ onClose, onConfirm, csvData }) => (
    <div className="fixed inset-0 z-999 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-[700px] rounded-lg bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold">Confirm Bank Statement Import</h2>

        <div className="mb-4">
          <p className="text-sm text-gray-600 mb-3">
            The following credit transactions were found in the bank statement:
          </p>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <p className="text-sm font-medium text-blue-900">
              Found {csvData.length} credit transaction{csvData.length !== 1 ? 's' : ''}
            </p>
            <p className="text-xs text-blue-700 mt-1">
              Format: DD-MMM-YY (e.g., 31-Oct-25) • Debit transactions are automatically ignored
            </p>
          </div>

          {csvData.length > 0 ? (
            <div className="max-h-64 overflow-y-auto border rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Date</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Description</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Ref No</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {csvData.slice(0, 10).map((row, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-3 py-2 text-xs">{row["Date"]}</td>
                      <td className="px-3 py-2 text-xs">{row["Description"]}</td>
                      <td className="px-3 py-2 text-xs">{row["ReferenceNo"] || "-"}</td>
                      <td className="px-3 py-2 text-xs text-right">${parseFloat(row["Amount"]).toFixed(2)}</td>
                    </tr>
                  ))}
                  {csvData.length > 10 && (
                    <tr>
                      <td colSpan={4} className="px-3 py-2 text-xs text-center text-gray-500">
                        ... and {csvData.length - 10} more transaction{csvData.length - 10 !== 1 ? 's' : ''}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="rounded border-red-200 bg-red-50 p-4">
              <p className="text-sm text-red-800">
                No credit transactions found in the file.
              </p>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <button
            className="rounded bg-gray-200 px-4 py-2 hover:bg-gray-300"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="rounded bg-green-600 px-4 py-2 text-white hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            onClick={onConfirm}
            disabled={csvData.length === 0}
          >
            Import {csvData.length} Transaction{csvData.length !== 1 ? 's' : ''}
          </button>
        </div>
      </div>
    </div>
  );

  const filteredTransactions = React.useMemo(() => {
    let filtered = transactions;

    // Apply tab filter
    filtered = activeTab === "all"
      ? transactions
      : transactions.filter((t) => t.status.toLowerCase().replace(" ", "-") === activeTab);

    // Apply universal search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();

      filtered = filtered.filter((transaction) => {
        // Search in description
        if (transaction.description.toLowerCase().includes(query)) return true;

        // Search in customer name
        if (transaction.customer_site_name?.toLowerCase().includes(query)) return true;

        // Search in amount (convert to string and search)
        if (transaction.amount.toString().includes(query)) return true;

        // Search in date
        if (transaction.date.includes(query)) return true;

        // Search in status
        if (transaction.status.toLowerCase().includes(query)) return true;

        // Search in reference number
        if (transaction.reference_no?.toLowerCase().includes(query)) return true;

        return false;
      });
    }

    return filtered;
  }, [transactions, activeTab, searchQuery]);

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            Payment Reconciliation
          </h1>
          <p className="text-sm text-gray-500">
            Match transactions with customers
          </p>
        </div>
        <label className="flex cursor-pointer items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
          <IoMdCloudUpload className="h-5 w-5" /> Import CSV
          <input
            type="file"
            className="hidden"
            accept=".csv"
            onChange={handleFileUpload}
          />
        </label>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="rounded-lg bg-white p-6 shadow">
          <h3 className="text-sm font-medium text-gray-500">Total Transactions</h3>
          <p className="mt-2 text-3xl font-semibold">{transactions.length}</p>
        </div>
        <div className="rounded-lg bg-white p-6 shadow">
          <h3 className="text-sm font-medium text-gray-500">Matched</h3>
          <p className="mt-2 text-3xl font-semibold text-green-600">
            {transactions.filter((t) => t.status === "Matched").length}
          </p>
        </div>
        <div className="rounded-lg bg-white p-6 shadow">
          <h3 className="text-sm font-medium text-gray-500">Unmatched</h3>
          <p className="mt-2 text-3xl font-semibold text-red-600">
            {transactions.filter((t) => t.status === "Unmatched").length}
          </p>
        </div>
      </div>

      {/* Tabs and Table */}
      <div className="rounded-lg bg-white shadow">
        <div className="border-b px-4">
          <nav className="-mb-px flex">
            {["all", "matched", "unmatched"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`mr-8 py-4 text-sm font-medium ${
                  activeTab === tab
                    ? "border-b-2 border-blue-600 text-blue-600"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {tab
                  .split("-")
                  .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                  .join(" ")}
              </button>
            ))}
          </nav>
        </div>

        {/* Search Bar */}
        <div className="p-4 border-b">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search transactions by description, customer, amount, date, status, or reference no..."
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="rounded-lg bg-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-300 whitespace-nowrap"
              >
                Clear
              </button>
            )}
          </div>
          {searchQuery && (
            <div className="mt-3 text-sm text-gray-600">
              Found <span className="font-semibold">{filteredTransactions.length}</span> transaction{filteredTransactions.length !== 1 ? 's' : ''}
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  Reference No
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredTransactions.map((transaction) => (
                <tr
                  key={transaction.id}
                  id={`transaction-${transaction.id}`}
                  className={
                    transaction.id === highlightId
                      ? "bg-blue-50 transition-colors duration-1000"
                      : ""
                  }
                >
                  <td className="whitespace-nowrap px-6 py-4">{transaction.date}</td>
                  <td className="whitespace-nowrap px-6 py-4">
                    {transaction.reference_no ? (
                      <span className="text-gray-900">{transaction.reference_no}</span>
                    ) : (
                      <span className="text-gray-400 italic">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4">{transaction.description}</td>
                  <td className="px-6 py-4">
                    {transaction.customer_site_name ? (
                      <span className="font-medium text-blue-600">
                        {transaction.customer_site_name}
                      </span>
                    ) : (
                      <span className="text-gray-400 italic">Not matched</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    ${transaction.amount.toFixed(2)}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <span
                      className={`inline-flex rounded-full px-2 text-xs font-semibold ${
                        transaction.status === "Matched"
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {transaction.status}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-2">
                    {transaction.status === "Unmatched" ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setSelectedTransaction(transaction);
                            setShowReconcileModal(true);
                          }}
                          className="rounded-lg bg-green-600 px-4 py-2 text-white hover:bg-green-700"
                        >
                          Match
                        </button>
                        <button
                          onClick={() => handleDelete(transaction.id)}
                          className="rounded-lg bg-red-500 px-4 py-2 text-white hover:bg-red-600"
                        >
                          Delete
                        </button>
                      </div>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-green-100 px-4 py-2 text-sm font-semibold text-green-800">
                        Matched
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reconcile Modal */}
      {showReconcileModal && selectedTransaction && (
        <ReconcileModal
          transaction={selectedTransaction}
          onClose={() => {
            setShowReconcileModal(false);
            setSelectedTransaction(null);
          }}
          onReconcile={handleReconcile}
        />
      )}

      {/* CSV Import Mapping Modal */}
      {showMappingModal && (
        <MappingModal
          onClose={handleModalClose}
          onConfirm={handleMapping}
          csvData={csvData}
        />
      )}
    </div>
  );
};

export default Reconciliation;
