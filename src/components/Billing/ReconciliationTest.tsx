"use client";

import { supabase } from "@/utils/supabase/browserClient";
import { useRouter, useSearchParams } from "next/navigation";
import React, {
  useCallback,
  ChangeEvent,
  useEffect,
  useState,
  useMemo,
} from "react";
import { IoMdCloudUpload } from "react-icons/io";
import { toast } from "react-toastify";
import { ReconciliationService } from "@/services/reconcile-service";
import { BillingService } from '@/services/billing-service';
import { CustomerBalanceService } from "@/services/balance-service";

const Alert: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className,
}) => (
  <div
    className={`rounded-lg border border-red-200 bg-red-50 p-4 ${className}`}
  >
    {children}
  </div>
);

const AlertDescription: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => <div className="text-sm text-red-800">{children}</div>;

interface SuggestionMatch extends BillData {
  monthlyBillId?: string; // Add monthlyBillId to track which monthly bill matches
}

interface ColumnMapping {
  date: string;
  description: string;
  amount: string;
}

interface BillData {
  id: string;
  date: string;
  description: string;
  amount: number;
  status: "Unmatched" | "Matched" | "Partially Matched";
  paid_amount: number;
  pending_amount: number;
  bill_id?: string;
}

interface MonthlyBill {
  id: string;
  site_name: string;
  billing_period_start: string;
  billing_period_end: string;
  total_revenue: number;
  status: string;
  arrears: number;
  paid_amount: number;
  pending_balance: number;
  customer_id: string;
}

interface CSVRow {
  [key: string]: string;
}

interface DateFormatOption {
  label: string;
  value: string;
  example: string;
}

const DATE_FORMAT_OPTIONS: DateFormatOption[] = [
  { label: "DD/MM/YYYY", value: "dd/MM/yyyy", example: "31/12/2023" },
  { label: "MM/DD/YYYY", value: "MM/dd/yyyy", example: "12/31/2023" },
  { label: "YYYY-MM-DD", value: "yyyy-MM-dd", example: "2023-12-31" },
];

const ReconcileModal: React.FC<{
  bill: BillData;
  onClose: () => void;
  monthlyBills: MonthlyBill[];
  setSelectedBillId: (id: string | null) => void;
  setSelectedMonthlyBill: (bill: MonthlyBill | null) => void;
  onReconcileComplete: () => void; // Add new callback prop
}> = ({ 
  bill, 
  onClose, 
  monthlyBills, 
  setSelectedBillId, 
  setSelectedMonthlyBill,
  onReconcileComplete 
}) => {
  const [selectedBillId, setLocalSelectedBillId] = useState<string | null>(null);
  const [selectedMonthlyBill, setLocalSelectedMonthlyBill] = useState<MonthlyBill | null>(null);
  const [matchAmount, setMatchAmount] = useState<number>(bill.amount);
  const reconciliationService = useMemo(() => new ReconciliationService(), []);
  const billingService = useMemo(() => new CustomerBalanceService(), []);

  const router = useRouter();
  const handleBillSelection = async (monthlyBill: MonthlyBill) => {
      // Get the current customer balance
  const customerBalance = await billingService.getCustomerBalance(monthlyBill.customer_id);

    setLocalSelectedBillId(monthlyBill.id);
  setLocalSelectedMonthlyBill({
    ...monthlyBill,
    pending_balance: customerBalance // Use the accurate customer balance
  });
    setSelectedBillId(monthlyBill.id);
    setSelectedMonthlyBill(monthlyBill);
  };

  const handleReconcile = async () => {
    try {
      if (!selectedBillId || !selectedMonthlyBill) {
        toast.warn("Please select a valid bill for reconciliation");
        return;
      }
  
      await reconciliationService.matchTransactionToBills(bill.id, [{
        billId: selectedBillId,
        amount: matchAmount
      }]);
  
      toast.success("Transaction matched successfully");
      onReconcileComplete();  // Trigger data refresh in the parent component
      onClose();  // Close the modal
  
    } catch (error) {
      console.error("Error during reconciliation:", error);
      toast.error("Failed to match transaction");
    }
  };
  
  

  // Function to calculate the pending amount
  const calculatePendingAmount = (monthlyBill: MonthlyBill): number => {
    const totalDue = monthlyBill.total_revenue + (monthlyBill.arrears || 0);
    const paidAmount = monthlyBill.paid_amount || 0;
    return Math.max(0, totalDue - paidAmount);
  };

  return (
    <div className="fixed inset-0 z-999 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-[800px] rounded-lg bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold">Reconcile Transaction</h2>

        <div className="mb-4">
          <p>
            <strong>Transaction Amount:</strong> ${bill.amount.toFixed(2)}
          </p>
          {selectedMonthlyBill && (
            <>
              <p>
                <strong>Bill Total:</strong> $
                {selectedMonthlyBill.total_revenue.toFixed(2)}
              </p>
              <p>
                <strong>Previous Arrears:</strong> $
                {selectedMonthlyBill.arrears?.toFixed(2) || "0.00"}
              </p>
            </>
          )}
        </div>

        <div className="mb-4">
          <h3 className="mb-2 font-semibold">Available Bills</h3>
          <div className="max-h-60 overflow-y-auto">
            <table className="w-full">
              <thead className="sticky top-0 bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left">Select</th>
                  <th className="px-4 py-2 text-left">Site Name</th>
                  <th className="px-4 py-2 text-left">Period</th>
                  <th className="px-4 py-2 text-left">Original Amount</th>
                  <th className="px-4 py-2 text-left">Paid</th>
                  <th className="px-4 py-2 text-left">Pending</th>
                  {/* <th className="px-4 py-2 text-left">Arrears</th> */}
                </tr>
              </thead>
              <tbody>
                {monthlyBills.map((monthlyBill) => {
                  const pendingAmount = calculatePendingAmount(monthlyBill);
                  const paidAmount = monthlyBill.paid_amount || 0;

                  return (
                    <tr key={monthlyBill.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2">
                        <input
                          type="radio"
                          name="selectedBill"
                          onChange={() => handleBillSelection(monthlyBill)}
                          checked={selectedBillId === monthlyBill.id}
                        />
                      </td>
                      <td className="px-4 py-2">{monthlyBill.site_name}</td>
                      <td className="px-4 py-2">
                        {new Date(monthlyBill.billing_period_start).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-2">${monthlyBill.total_revenue.toFixed(2)}</td>
                      <td className="px-4 py-2">${paidAmount.toFixed(2)}</td>
                      <td className="px-4 py-2">${pendingAmount.toFixed(2)}</td>
                      {/* <td className="px-4 py-2">${(monthlyBill.arrears || 0).toFixed(2)}</td> */}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded bg-gray-200 px-4 py-2 hover:bg-gray-300"
          >
            Cancel
          </button>
          <button
            onClick={handleReconcile}
            className="rounded bg-primary px-4 py-2 text-white hover:bg-green-400"
            disabled={!selectedBillId}
          >
            Match
          </button>
        </div>
      </div>
    </div>
  );
};

const ReconciliationTest = () => {
  const [activeTab, setActiveTab] = useState<string>("all");
  const [mappedData, setMappedData] = useState<BillData[]>([]);
  const [csvColumns, setCsvColumns] = useState<string[]>([]);
  const [csvData, setCSVData] = useState<CSVRow[]>([]);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [showMappingModal, setShowMappingModal] = useState(false);
  const [showReconcileModal, setShowReconcileModal] = useState(false);
  const [selectedBill, setSelectedBill] = useState<BillData | null>(null);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({
    date: "",
    description: "",
    amount: "",
  });
  const [dateFormat, setDateFormat] = useState<string>("dd/MM/yyyy");
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<SuggestionMatch[]>([]);
  const [autoMatchThreshold] = useState(0.9);
  const [monthlyBills, setMonthlyBills] = useState<MonthlyBill[]>([]);
  const [selectedBillId, setSelectedBillId] = useState<string | null>(null);
  const [selectedMonthlyBill, setSelectedMonthlyBill] =
    useState<MonthlyBill | null>(null);

  const router = useRouter();

  const searchParams = useSearchParams();
  const highlightId = searchParams?.get("highlightId");

  const reconciliationService = useMemo(() => new ReconciliationService(), []);
  const billingService = useMemo(() => new BillingService(), []);

  useEffect(() => {
    // After page refresh, we should fetch the bills again and update the state accordingly
    fetchMonthlyBills();
  }, []);

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

  const fetchMonthlyBills = async () => {
    try {
      const { data, error } = await supabase
        .from("monthly_bills")
        .select("*")
        .order("billing_period_start", { ascending: false });
      if (error) throw error;
      setMonthlyBills(data || []);
    } catch (error) {
      console.error("Error fetching monthly bills:", error);
      alert("Error fetching monthly bills. Please try again.");
    }
  };

  const fetchData = useCallback(async () => {
    try {
      const [transactionsResponse, monthlyBillsResponse] = await Promise.all([
        supabase
          .from("transactions")
          .select("*")
          .order("date", { ascending: false }),
        supabase
          .from("monthly_bills")
          .select("*")
          .order("billing_period_start", { ascending: false })
      ]);

      if (transactionsResponse.error) throw transactionsResponse.error;
      if (monthlyBillsResponse.error) throw monthlyBillsResponse.error;

      // Update both states
      setMappedData(transactionsResponse.data || []);
      setMonthlyBills(monthlyBillsResponse.data || []);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to fetch data");
    }
  }, []);


  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleReconcile = async () => {
    try {
      if (!selectedBill || !selectedBillId || !selectedMonthlyBill) {
        toast.warn("Please select a valid bill for reconciliation");
        return;
      }

      const matchedBills = [{
        billId: selectedBillId,
        amount: selectedBill.amount
      }];

      await reconciliationService.matchTransactionToBills(selectedBill.id, matchedBills);
      
      // Fetch updated data immediately
      await fetchData();
      
      toast.success("Transaction matched successfully");
      setShowReconcileModal(false);
      setSelectedBill(null);
      setSelectedBillId(null);
      setSelectedMonthlyBill(null);
    } catch (error) {
      console.error("Error during reconciliation:", error);
      toast.error("Failed to match transaction");
    }
  };

  const handleUndo = async (transaction: BillData) => {
    try {
      await reconciliationService.undoTransactionMatch(transaction.id);
      
      // Fetch updated data immediately
      await fetchData();
      toast.dismiss();
      toast.success("Transaction unmatched successfully");
    } catch (error) {
      console.error("Error during undo:", error);
      toast.error("Failed to unmatch transaction");
    }
  };


  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
  };
  const isValidDate = (dateStr: string, format: string): boolean => {
    const parts = dateStr.split(/[-/]/);
    if (parts.length !== 3) return false;

    let year, month, day;

    switch (format.toLowerCase()) {
      case "dd/mm/yyyy":
        [day, month, year] = parts.map(Number);
        break;
      case "mm/dd/yyyy":
        [month, day, year] = parts.map(Number);
        break;
      case "yyyy-mm-dd":
        [year, month, day] = parts.map(Number);
        break;
      default:
        return false;
    }

    const date = new Date(year, month - 1, day);
    return (
      date.getFullYear() === year &&
      date.getMonth() === month - 1 &&
      date.getDate() === day
    );
  };

  const validateData = (
    data: CSVRow[],
    columnMapping: ColumnMapping,
    dateFormat: string,
  ): string[] => {
    const errors: string[] = [];

    data.forEach((row, index) => {
      const lineNumber = index + 2;

      // Validate date
      const dateValue = row[columnMapping.date];
      if (!dateValue || !isValidDate(dateValue, dateFormat)) {
        errors.push(`Invalid date in row ${lineNumber}: ${dateValue}`);
      }

      // Validate amount
      const amountValue = parseFloat(row[columnMapping.amount]);
      if (isNaN(amountValue)) {
        errors.push(
          `Invalid amount in row ${lineNumber}: ${row[columnMapping.amount]}`,
        );
      }

      // Validate description
      if (!row[columnMapping.description]?.trim()) {
        errors.push(`Missing description in row ${lineNumber}`);
      }
    });

    return errors;
  };

  const handleFileUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files[0] && files[0].type === "text/csv") {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        if (text) {
          parseCSV(text); // Extract and set headers
          setShowMappingModal(true); // Show the mapping modal
        }
      };
      reader.readAsText(files[0]);
    } else {
      alert("Please upload a valid CSV file.");
    }
  };

  const handleMapping = async () => {
    const errors = validateData(csvData, columnMapping, dateFormat);
    setValidationErrors(errors);

    if (errors.length > 0) return;

    try {
      const processedData = csvData.map((row) => ({
        date: row[columnMapping.date],
        description: row[columnMapping.description],
        amount: parseFloat(row[columnMapping.amount]),
        status: "Unmatched",
        paid_amount: 0,
        pending_amount: parseFloat(row[columnMapping.amount]),
      }));

      const { error } = await supabase
        .from("transactions")
        .insert(processedData);

      if (error) throw error;

      await fetchData();
      setShowMappingModal(false);
    } catch (error) {
      console.error("Error uploading transactions:", error);
      alert("Error saving transactions. Please try again.");
    }
  };

  const handleDelete = async (transactionId: string) => {
    try {
      const { error } = await supabase
        .from("reconciliation")
        .delete()
        .eq("id", transactionId);

      if (error) throw error;

      await fetchData();
      toast.success("Transaction deleted successfully.");
    } catch (error) {
      console.error("Error deleting transaction:", error);
      toast.error("Error deleting transaction. Please try again.");
    }
  };

  const parseCSV = (text: string) => {
    const lines = text.split("\n").filter((line) => line.trim());
    if (lines.length === 0) return;

    const headers = lines[0].split(",").map((header) => header.trim());
    setCsvColumns(headers);

    const data = lines.slice(1).map((line) => {
      const values = line.split(",").map((value) => value.trim());
      const row: CSVRow = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || "";
      });
      return row;
    });

    setCSVData(data);
  };

  const MappingModal: React.FC<{
    onClose: () => void;
    onConfirm: () => void;
    csvColumns: string[];
    columnMapping: ColumnMapping;
    setColumnMapping: (mapping: ColumnMapping) => void;
    dateFormat: string;
    setDateFormat: (format: string) => void;
    validationErrors: string[];
  }> = ({
    onClose,
    onConfirm,
    csvColumns,
    columnMapping,
    setColumnMapping,
    dateFormat,
    setDateFormat,
    validationErrors,
  }) => (
    <div className="fixed inset-0 z-999 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-[600px] rounded-lg bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold">Map CSV Columns</h2>

        <div className="mb-4">
          <label className="block text-sm font-medium">Date Format</label>
          <select
            className="mt-1 w-full rounded border p-2"
            value={dateFormat}
            onChange={(e) => setDateFormat(e.target.value)}
          >
            {DATE_FORMAT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label} (e.g., {option.example})
              </option>
            ))}
          </select>
        </div>

        {csvColumns.length > 0 ? (
          Object.entries(columnMapping).map(([key, value]) => (
            <div key={key} className="mb-4">
              <label className="block text-sm font-medium capitalize">
                {key}
              </label>
              <select
                className="mt-1 w-full rounded border p-2"
                value={value}
                onChange={(e) =>
                  setColumnMapping({ ...columnMapping, [key]: e.target.value })
                }
              >
                <option value="">Select column</option>
                {csvColumns.map((col) => (
                  <option key={col} value={col}>
                    {col}
                  </option>
                ))}
              </select>
            </div>
          ))
        ) : (
          <p className="text-sm text-red-500">
            No columns found in the uploaded file.
          </p>
        )}

        {validationErrors.length > 0 && (
          <div className="mb-4 rounded border-red-200 bg-red-50 p-4">
            <ul className="list-inside list-disc text-sm text-red-800">
              {validationErrors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button
            className="rounded bg-gray-200 px-4 py-2 hover:bg-gray-300"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
            onClick={onConfirm}
          >
            Confirm Mapping
          </button>
        </div>
      </div>
    </div>
  );

  const findSimilarTransactions = (bill: BillData): SuggestionMatch[] => {
    // First find matching transactions from CSV data
    const matchingTransactions = mappedData.filter((transaction) => {
      if (transaction.id === bill.id) return false;

      const amountDiff = Math.abs(transaction.amount - bill.amount);
      const dateDiff = Math.abs(
        new Date(transaction.date).getTime() - new Date(bill.date).getTime(),
      );
      const descriptionSimilarity = calculateStringSimilarity(
        transaction.description.toLowerCase(),
        bill.description.toLowerCase(),
      );

      return (
        amountDiff < 0.01 && // Exact amount match
        dateDiff <= 7 * 24 * 60 * 60 * 1000 && // Within 7 days
        descriptionSimilarity > autoMatchThreshold
      );
    });

    // Then find matching monthly bills and combine the information
    return matchingTransactions.map((transaction) => {
      const matchingMonthlyBill = monthlyBills.find(
        (monthlyBill) =>
          Math.abs(monthlyBill.total_revenue - transaction.amount) < 0.01,
      );

      return {
        ...transaction,
        monthlyBillId: matchingMonthlyBill?.id,
      };
    });
  };

  const calculateStringSimilarity = (str1: string, str2: string): number => {
    const length = Math.max(str1.length, str2.length);
    const distance = levenshteinDistance(str1, str2);
    return 1 - distance / length;
  };

  const levenshteinDistance = (str1: string, str2: string): number => {
    const matrix = Array(str2.length + 1)
      .fill(null)
      .map(() => Array(str1.length + 1).fill(null));

    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + indicator,
        );
      }
    }

    return matrix[str2.length][str1.length];
  };

  const filteredData = useMemo(() => {
    switch (activeTab) {
      case "matched":
        return mappedData.filter((item) => item.status === "Matched");
      case "partially-matched":
        return mappedData.filter((item) => item.status === "Partially Matched");
      case "unmatched":
        return mappedData.filter((item) => item.status === "Unmatched");
      default:
        return mappedData;
    }
  }, [activeTab, mappedData]);

  return (
    <div className="min-h-screen bg-gray-100 p-6 ">
      {suggestions.length > 0 && (
        <div className="mb-6 rounded-lg bg-blue-50 p-4">
          <h3 className="mb-2 font-semibold text-blue-900">
            Suggested Matches
          </h3>
          <div className="space-y-2">
            {suggestions.map((suggestion, index) => (
              <div
                key={index}
                className="flex items-center justify-between rounded-md bg-white p-3"
              >
                <div>
                  <p className="font-medium">{suggestion.description}</p>
                  <p className="text-sm text-gray-600">
                    {suggestion.date} - ${suggestion.amount.toFixed(2)}
                  </p>
                </div>
                <button
                  onClick={() => {
                    if (suggestion.monthlyBillId) {
                      const matchingMonthlyBill = monthlyBills.find(
                        (bill) => bill.id === suggestion.monthlyBillId,
                      );

                      if (matchingMonthlyBill) {
                        const arrearsAmount = Math.abs(
                          suggestion.amount - matchingMonthlyBill.total_revenue,
                        );
                        handleReconcile();
                      }
                    } else {
                      alert("No matching monthly bill found");
                    }
                  }}
                  className={`rounded-md px-3 py-1 text-sm text-white ${
                    suggestion.monthlyBillId
                      ? "bg-blue-600 hover:bg-blue-700"
                      : "cursor-not-allowed bg-gray-400"
                  }`}
                  disabled={!suggestion.monthlyBillId}
                >
                  {suggestion.monthlyBillId
                    ? "Accept Match"
                    : "No Monthly Bill Match"}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="mb-2">
          <h1 className="text-2xl font-bold text-gray-800">
            Payment Reconciliation
          </h1>
          <p className="text-sm text-gray-500">
            Match payments with pending bills
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
      <div className="mt-6 grid grid-cols-4 gap-4">
        <div className="rounded-lg bg-white p-6 shadow">
          <h3 className="text-sm font-medium text-gray-500">Total Bills</h3>
          <p className="mt-2 text-3xl font-semibold">{mappedData.length}</p>
        </div>
        <div className="rounded-lg bg-white p-6 shadow">
          <h3 className="text-sm font-medium text-gray-500">Matched</h3>
          <p className="mt-2 text-3xl font-semibold text-green-600">
            {mappedData.filter((item) => item.status === "Matched").length}
          </p>
        </div>
        <div className="rounded-lg bg-white p-6 shadow">
          <h3 className="text-sm font-medium text-gray-500">
            Partially Matched
          </h3>
          <p className="mt-2 text-3xl font-semibold text-yellow-600">
            {
              mappedData.filter((item) => item.status === "Partially Matched")
                .length
            }
          </p>
        </div>
        <div className="rounded-lg bg-white p-6 shadow">
          <h3 className="text-sm font-medium text-gray-500">Unmatched</h3>
          <p className="mt-2 text-3xl font-semibold text-red-600">
            {mappedData.filter((item) => item.status === "Unmatched").length}
          </p>
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
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Amount ($)
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Paid ($)
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Pending ($)
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredData.map((row) => (
                <tr
                  key={row.id}
                  id={`transaction-${row.id}`} // Add this ID for scrolling
                  className={`${
                    row.id === highlightId
                      ? "bg-primary/[.1] transition-colors duration-1000"
                      : ""
                  }`}
                >
                  <td className="whitespace-nowrap px-6 py-4">{row.date}</td>
                  <td className="px-6 py-4">{row.description}</td>
                  <td className="whitespace-nowrap px-6 py-4">
                    {row.amount.toFixed(2)}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    {row.paid_amount.toFixed(2)}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    {row.pending_amount.toFixed(2)}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <span
                      className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                        row.status === "Matched"
                          ? "bg-green-100 text-green-800"
                          : row.status === "Partially Matched"
                            ? "bg-primary/0.1 text-yellow-800"
                            : "bg-red-100 text-red-800"
                      }`}
                    >
                      {row.status}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-2 text-right">
                    {row.status === "Unmatched" ? (
                      <div className="flex justify-end space-x-2">
                        {/* Match Button */}
                        <button
                          className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-base font-medium text-white hover:bg-green-400"
                          onClick={() => {
                            setSelectedBill(row);
                            setShowReconcileModal(true);
                          }}
                        >
                          Match
                        </button>

                        {/* Delete Button */}
                        <button
                          className="inline-flex items-center justify-center rounded-lg bg-red-500 px-4 py-2 text-base font-medium text-white hover:bg-red-400"
                          onClick={() => handleDelete(row.id)}
                        >
                          Delete
                        </button>
                      </div>
                    ) : (
                      <div className="flex justify-end space-x-3">
                        {/* View Bill Button */}
                        <button
                          className="inline-flex items-center justify-center rounded-lg bg-dark-2 px-4 py-2 text-base font-medium text-white hover:bg-dark-3"
                          onClick={() =>
                            router.push(`/dashboard/billing/monthly?highlightId=${row.bill_id}`)
                          }
                        >
                          View Bill
                        </button>

                        {/* Undo Button */}
                        <button
                          className="inline-flex items-center justify-center rounded-lg bg-yellow-400 px-4 py-2 text-base font-medium text-white hover:bg-yellow-300"
                          onClick={() => handleUndo(row)}
                        >
                          Undo
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showMappingModal && (
        <MappingModal
          onClose={() => setShowMappingModal(false)}
          onConfirm={handleMapping}
          csvColumns={csvColumns}
          columnMapping={columnMapping}
          setColumnMapping={setColumnMapping}
          dateFormat={dateFormat}
          setDateFormat={setDateFormat}
          validationErrors={validationErrors}
        />
      )}
  {showReconcileModal && selectedBill && (
    <ReconcileModal
      bill={selectedBill}
      monthlyBills={monthlyBills}
      onClose={() => {
        setShowReconcileModal(false);
        setSelectedBill(null);
        setSelectedBillId(null);
        setSelectedMonthlyBill(null);
      }}
      setSelectedBillId={setSelectedBillId}
      setSelectedMonthlyBill={setSelectedMonthlyBill}
      onReconcileComplete={fetchData} 
    />
)}
    </div>
  );
};

export default ReconciliationTest;
