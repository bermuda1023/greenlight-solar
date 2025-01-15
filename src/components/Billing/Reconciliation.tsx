"use client";

import { supabase } from "@/utils/supabase/browserClient";
import { useRouter } from "next/navigation";
import React, { useState, ChangeEvent, useEffect, useCallback } from "react";
import { IoMdCloudUpload } from "react-icons/io";
import { MdFileUpload, MdOutlineCancel } from "react-icons/md";

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
  id: number;
  date: string;
  description: string;
  amount: number;
  status: "Unmatched" | "Matched" | "Partially Matched";
  paidAmount: number;
  pendingAmount: number;
  transactionType?: string;
  category?: string;
}

interface CSVRow {
  [key: string]: string;
}

interface DateFormatOption {
  label: string;
  value: string;
  example: string;
}

interface MonthlyBill {
  id: string; // uuid
  site_name: string;
  email: string;
  address: string;
  billing_period_start: string;
  billing_period_end: string;
  production_kwh: number;
  self_consumption: number;
  export_kwh: number;
  total_cost: number;
  energy_rate: number;
  total_revenue: number;
  savings: number;
  arrears: number;
  status: string;
  created_at: string;
}

// Update ReconcileModalProps
interface ReconcileModalProps {
  bill: BillData;
  onClose: () => void;
  onReconcile: (
    billId: number,
    paidAmount: number,
    monthlyBillId: string,
    arrearsAmount: number,
  ) => Promise<void>;
  monthlyBills: MonthlyBill[];
}

const DATE_FORMAT_OPTIONS: DateFormatOption[] = [
  { label: "DD/MM/YYYY", value: "dd/MM/yyyy", example: "31/12/2023" },
  { label: "MM/DD/YYYY", value: "MM/dd/yyyy", example: "12/31/2023" },
  { label: "YYYY-MM-DD", value: "yyyy-MM-dd", example: "2023-12-31" },
];

const ReconcileModal: React.FC<ReconcileModalProps> = ({
  bill,
  onClose,
  onReconcile,
  monthlyBills,
}) => {
  const [selectedBillId, setSelectedBillId] = useState<string | null>(null);
  const [selectedMonthlyBill, setSelectedMonthlyBill] = useState<MonthlyBill | null>(null);

  // Helper function to determine matching status
  const getMatchStatus = (difference: number) => {
    if (difference === 0) return { status: "Matched", className: "text-green-600" };
    if (difference <= 1) return { status: "Partially Matched", className: "text-yellow-600" };
    return { status: "Unmatched", className: "text-red-600" };
  };

  const handleBillSelection = (monthlyBill: MonthlyBill) => {
    setSelectedBillId(monthlyBill.id);
    setSelectedMonthlyBill(monthlyBill);
  };

  const handleReconcile = async () => {
    if (selectedBillId && selectedMonthlyBill) {
      const difference = Math.abs(bill.amount - selectedMonthlyBill.total_revenue);
      await onReconcile(
        bill.id,
        selectedMonthlyBill.total_revenue,
        selectedBillId,
        difference
      );
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-[800px] rounded-lg bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold">Reconcile Transaction</h2>

        <div className="mb-4">
          <p><strong>Amount to Reconcile:</strong> ${bill.amount.toFixed(2)}</p>
          {selectedMonthlyBill && (
            <>
              <p><strong>Selected Bill Revenue:</strong> ${selectedMonthlyBill.total_revenue.toFixed(2)}</p>
              {Math.abs(bill.amount - selectedMonthlyBill.total_revenue) > 0 && (
                <p className={getMatchStatus(Math.abs(bill.amount - selectedMonthlyBill.total_revenue)).className}>
                  <strong>Status:</strong> {getMatchStatus(Math.abs(bill.amount - selectedMonthlyBill.total_revenue)).status}
                </p>
              )}
            </>
          )}
        </div>

        <div className="mb-4">
          <h3 className="mb-2 font-semibold">Select Monthly Bill to Match</h3>
          <div className="max-h-60 overflow-y-auto">
            <table className="w-full">
              <thead className="sticky top-0 bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left">Select</th>
                  <th className="px-4 py-2 text-left">Site Name</th>
                  <th className="px-4 py-2 text-left">Revenue Amount</th>
                  <th className="px-4 py-2 text-left">Status</th>
                  <th className="px-4 py-2 text-left">Match Status</th>
                </tr>
              </thead>
              <tbody>
                {monthlyBills
                  .filter((monthlyBill) => monthlyBill.status.toLowerCase() === "pending")
                  .map((monthlyBill) => {
                    const difference = Math.abs(monthlyBill.total_revenue - bill.amount);
                    const matchStatus = getMatchStatus(difference);
                    return (
                      <tr
                        key={monthlyBill.id}
                        className={`hover:bg-gray-50 ${difference === 0 ? "bg-green-50" : ""}`}
                      >
                        <td className="px-4 py-2">
                          <input
                            type="radio"
                            name="selectedBill"
                            onChange={() => handleBillSelection(monthlyBill)}
                            checked={selectedBillId === monthlyBill.id}
                          />
                        </td>
                        <td className="px-4 py-2">{monthlyBill.site_name}</td>
                        <td className="px-4 py-2">${monthlyBill.total_revenue.toFixed(2)}</td>
                        <td className="px-4 py-2">{monthlyBill.status}</td>
                        <td className="px-4 py-2">
                          <span className={matchStatus.className}>
                            {matchStatus.status}
                          </span>
                        </td>
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
            className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
            disabled={!selectedBillId}
          >
            Reconcile
          </button>
        </div>
      </div>
    </div>
  );
};

const Reconciliation = () => {
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

  const router = useRouter();

  const BUCKET_NAME = "csv-uploads";
  const fetchMonthlyBills = async () => {
    try {
      const { data, error } = await supabase
        .from("monthly_bills")
        .select("*")
        .eq("status", "Pending")
        .order("billing_period_start", { ascending: false });

      if (error) throw error;
      setMonthlyBills(data || []);
    } catch (error) {
      console.error("Error fetching monthly bills:", error);
      alert("Error fetching monthly bills. Please try again.");
    }
  };

  const fetchSavedFile = useCallback(async () => {
    try {
      const { data: files, error: listError } = await supabase.storage
        .from(BUCKET_NAME)
        .list();

      if (listError) throw listError;

      if (files && files.length > 0) {
        const fileName = files[0].name;
        const { data: fileData, error: downloadError } = await supabase.storage
          .from(BUCKET_NAME)
          .download(fileName);

        if (downloadError) throw downloadError;

        const text = await fileData.text();
        setUploadedFileName(fileName);
        parseCSV(text);

        // If the file contains status information, use it directly
        if (text.includes("status,paidAmount,pendingAmount")) {
          const lines = text.split("\n");
          const headers = lines[0].split(",").map((h) => h.trim());
          const data = lines.slice(1).map((line, index) => {
            const values = line.split(",").map((v) => v.trim());
            return {
              id: index,
              date: values[headers.indexOf("date")],
              description: values[headers.indexOf("description")],
              amount: parseFloat(values[headers.indexOf("amount")]),
              status: values[headers.indexOf("status")] as BillData["status"], // Cast to union type
              paidAmount: parseFloat(values[headers.indexOf("paidAmount")]),
              pendingAmount: parseFloat(
                values[headers.indexOf("pendingAmount")],
              ),
            };
          });
          setMappedData(data);
        }
      }
    } catch (error) {
      console.error("Error fetching saved file:", error);
    }
  }, [BUCKET_NAME]);

  useEffect(() => {
    fetchSavedFile();
    fetchMonthlyBills();
  }, [fetchSavedFile]);

  const isValidDate = (dateStr: string): boolean => {
    const format = dateFormat.toLowerCase();
    const parts = dateStr.split(/[-/]/);

    if (parts.length !== 3) return false;

    let year, month, day;

    switch (format) {
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
      date.getMonth() === month - 1 &&
      date.getDate() === day &&
      date.getFullYear() === year
    );
  };

  const validateData = (data: CSVRow[]): string[] => {
    const errors: string[] = [];

    data.forEach((row, index) => {
      const lineNumber = index + 2; // Adding 2 to account for header row and 0-based index

      if (!isValidDate(row[columnMapping.date])) {
        errors.push(`Invalid date format in row ${lineNumber}`);
      }

      const amount = parseFloat(row[columnMapping.amount]);
      if (isNaN(amount)) {
        errors.push(`Invalid amount in row ${lineNumber}`);
      }

      if (!row[columnMapping.description]?.trim()) {
        errors.push(`Missing description in row ${lineNumber}`);
      }
    });

    return errors;
  };

  const handleReconcile = async (
    csvBillId: number,
    paidAmount: number,
    monthlyBillId: string,
    arrearsAmount: number,
  ) => {
    try {
      // First, create the arrears column if it doesn't exist
      try {
        await supabase.rpc("add_arrears_column_if_not_exists");
      } catch (error) {
        console.error("Error checking/creating arrears column:", error);
      }

      // Update the monthly bill in Supabase
      const { error: updateError } = await supabase
        .from("monthly_bills")
        .update({
          status: "Reconciled",
          arrears: arrearsAmount,
        })
        .eq("id", monthlyBillId);

      if (updateError) throw updateError;

      // Update the CSV data
      const updatedData = mappedData.map((bill) => {
        if (bill.id === csvBillId) {
          return {
            ...bill,
            status:
              arrearsAmount > 0
                ? ("Partially Matched" as const)
                : ("Matched" as const),
            paidAmount: paidAmount,
            pendingAmount: arrearsAmount,
          };
        }
        return bill;
      });

      setMappedData(updatedData);
      await updateCSVFile(updatedData);

      // Redirect to monthly bills page
      router.push(`/dashboard/billing/monthly?highlightId=${monthlyBillId}`);
    } catch (error) {
      console.error("Error during reconciliation:", error);
      alert("Error updating the reconciliation. Please try again.");
    }
  };

  const updateCSVFile = async (data: BillData[]) => {
    // Convert data back to CSV format
    const headers = [
      "date",
      "description",
      "amount",
      "status",
      "paidAmount",
      "pendingAmount",
    ];
    const csvContent = [
      headers.join(","),
      ...data.map((row) =>
        [
          row.date,
          row.description,
          row.amount,
          row.status,
          row.paidAmount,
          row.pendingAmount,
        ].join(","),
      ),
    ].join("\n");

    const fileName = uploadedFileName || "reconciliation-data.csv";
    const file = new File([csvContent], fileName, { type: "text/csv" });

    try {
      const { error } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(fileName, file, { upsert: true });

      if (error) throw error;
    } catch (error) {
      console.error("Error updating CSV file:", error);
      alert("Error updating the data. Please try again.");
    }
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
  };

  const handleFileUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files[0] && files[0].type === "text/csv") {
      const file = files[0];
      const fileName = `reconciliation-data.csv`;

      try {
        if (uploadedFileName) {
          await supabase.storage.from(BUCKET_NAME).remove([uploadedFileName]);
        }

        const { error: uploadError } = await supabase.storage
          .from(BUCKET_NAME)
          .upload(fileName, file, { upsert: true });

        if (uploadError) throw uploadError;

        setUploadedFileName(fileName);

        const reader = new FileReader();
        reader.onload = (e) => {
          const text = e.target?.result as string;
          if (text) {
            parseCSV(text);
            setShowMappingModal(true);
          }
        };
        reader.readAsText(file);
      } catch (error) {
        console.error("Error uploading file:", error);
        alert("Error uploading file. Please try again.");
      }
    } else {
      alert("Please upload a valid CSV file.");
    }
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

  const handleMapping = async () => {
    const errors = validateData(csvData);
    setValidationErrors(errors);

    if (errors.length > 0) {
      return;
    }

    const processedData: BillData[] = csvData.map((row, index) => {
      const amountValue = parseFloat(row[columnMapping.amount]);
      return {
        id: index,
        date: row[columnMapping.date],
        description: row[columnMapping.description],
        amount: isNaN(amountValue) ? 0 : amountValue,
        status: "Unmatched",
        paidAmount: 0,
        pendingAmount: amountValue,
        transactionType: detectTransactionType(row[columnMapping.description]),
        category: detectCategory(row[columnMapping.description]),
      };
    });

    // Auto-match similar transactions
    processedData.forEach((bill) => {
      const similarTransactions = findSimilarTransactions(bill);
      if (similarTransactions.length > 0) {
        setSuggestions((prev) => [...prev, ...similarTransactions]);
      }
    });

    setMappedData(processedData);
    setShowMappingModal(false);
    await updateCSVFile(processedData);
  };

  const detectTransactionType = (description: string): string => {
    description = description.toLowerCase();
    if (description.includes("invoice") || description.includes("bill"))
      return "Bill";
    if (description.includes("payment") || description.includes("transfer"))
      return "Payment";
    return "Other";
  };

  const detectCategory = (description: string): string => {
    description = description.toLowerCase();
    if (description.includes("service")) return "Services";
    if (description.includes("product") || description.includes("goods"))
      return "Products";
    if (description.includes("consulting")) return "Consulting";
    return "Uncategorized";
  };

  const handleDeleteFile = async () => {
    if (!uploadedFileName) return;

    try {
      const { error } = await supabase.storage
        .from(BUCKET_NAME)
        .remove([uploadedFileName]);

      if (error) throw error;

      setMappedData([]);
      setCSVData([]);
      setCsvColumns([]);
      setUploadedFileName(null);
    } catch (error) {
      console.error("Error deleting file:", error);
    }
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

  const MappingModal = () => (
    <div className="fixed inset-0 z-9999 flex items-center justify-center bg-gray-5 bg-opacity-50 backdrop-blur-sm">
      <div className="w-2/3 max-w-2xl rounded-lg bg-white p-8">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900">File Setup</h2>
          <p className="text-sm text-gray-500">
            Let&apos;s set up your file for reconciliation
          </p>
        </div>

        {/* Step 1: Basic Format */}
        <div className="mb-6">
          <h3 className="mb-4 text-lg font-medium">
            Step 1: Tell us about your data format
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Date Format
              </label>
              <select
                className="mt-1 block w-full rounded-md border p-2"
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
          </div>
        </div>

        {/* Step 2: Column Mapping */}
        <div className="mb-6">
          <h3 className="mb-4 text-lg font-medium">Step 2: Map your columns</h3>

          <div className="space-y-4">
            {Object.entries({
              Date: "date",
              Description: "description",
              Amount: "amount",
            } as const).map(([label, key]) => (
              <div key={key} className="grid grid-cols-2 items-center gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    {label}
                  </label>
                  <p className="text-xs text-gray-500">
                    {key === "date" && `Format: ${dateFormat}`}
                    {key === "amount" && "Numeric values only"}
                  </p>
                </div>
                <select
                  className="block w-full rounded-md border p-2"
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
          </div>
        </div>

        {/* Validation Errors */}
        {validationErrors.length > 0 && (
          <Alert className="mb-4">
            <AlertDescription>
              <ul className="list-inside list-disc">
                {validationErrors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <button
            className="rounded-md border px-4 py-2"
            onClick={() => setShowMappingModal(false)}
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

  const filteredData =
    activeTab === "all"
      ? mappedData
      : mappedData.filter(
          (item) => item.status.toLowerCase().replace(" ", "-") === activeTab,
        );

  return (
    <div className="min-h-screen bg-gray-100 p-6">
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
                        handleReconcile(
                          suggestion.id,
                          matchingMonthlyBill.total_revenue,
                          suggestion.monthlyBillId,
                          arrearsAmount,
                        );
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
            Match bank payments with pending bills and mark them as reconciled.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={handleDeleteFile}
            className="flex items-center gap-2 rounded-md bg-red-600 px-4 py-2 text-white hover:bg-red-700"
            disabled={!uploadedFileName}
          >
            <MdOutlineCancel className="h-5 w-5" /> Remove Data
          </button>
          <label className="flex cursor-pointer items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
            <IoMdCloudUpload className="h-5 w-5" /> Import
            <input
              type="file"
              className="hidden"
              accept=".csv"
              onChange={handleFileUpload}
            />
          </label>
        </div>
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
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredData.map((row) => (
                <tr key={row.id}>
                  <td className="whitespace-nowrap px-6 py-4">{row.date}</td>
                  <td className="px-6 py-4">{row.description}</td>
                  <td className="whitespace-nowrap px-6 py-4">
                    {row.amount.toFixed(2)}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    {row.paidAmount.toFixed(2)}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    {row.pendingAmount.toFixed(2)}
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
                    <button
                      className="text-blue-600 hover:text-blue-900"
                      onClick={() => {
                        setSelectedBill(row);
                        setShowReconcileModal(true);
                      }}
                      disabled={row.status === "Matched"}
                    >
                      Match
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showMappingModal && <MappingModal />}
      {showReconcileModal && selectedBill && (
        <ReconcileModal
          bill={selectedBill}
          monthlyBills={monthlyBills}
          onClose={() => {
            setShowReconcileModal(false);
            setSelectedBill(null);
          }}
          onReconcile={handleReconcile}
        />
      )}
    </div>
  );
};

export default Reconciliation;
