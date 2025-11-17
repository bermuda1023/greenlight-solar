"use client";

import { supabase } from "@/utils/supabase/browserClient";
import { useRouter, useSearchParams } from "next/navigation";
import React, { useState, ChangeEvent, useEffect, useCallback } from "react";
import { IoMdCloudUpload } from "react-icons/io";
import { toast } from "react-toastify";

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
  total_revenue: number;
  arrears: number; // Note: Still used in reconciliation logic
  status: string;
  created_at: string;
}

// Update ReconcileModalProps
interface ReconcileModalProps {
  bill: BillData;
  onClose: () => void;
  onReconcile: (
    transactionId: string,
    paidAmount: number,
    billId: string,
    arrearsAmount: number,
  ) => Promise<void>;
  monthlyBills: MonthlyBill[];
}

const DATE_FORMAT_OPTIONS: DateFormatOption[] = [
  { label: "DD/MM/YYYY", value: "dd/MM/yyyy", example: "31/12/2023" },
  { label: "MM/DD/YYYY", value: "MM/dd/yyyy", example: "12/31/2023" },
  { label: "YYYY-MM-DD", value: "yyyy-MM-dd", example: "2023-12-31" },
];

interface ReconcileModalProps {
  bill: BillData;
  onClose: () => void;
  onReconcile: (
    transactionId: string,
    paidAmount: number,
    billId: string,
    newPendingAmount: number,
  ) => Promise<void>;
  monthlyBills: MonthlyBill[];
}

const ReconcileModal: React.FC<ReconcileModalProps> = ({
  bill,
  onClose,
  onReconcile,
  monthlyBills,
}) => {
  const [selectedBills, setSelectedBills] = useState<Map<string, { bill: MonthlyBill; allocatedAmount: number; existingPayments: number }>>(new Map());
  const [remainingAmount, setRemainingAmount] = useState<number>(bill.amount);

  
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    // Fetch existing payments for all selected bills
    const fetchExistingPayments = async (billId: string) => {
      const { data, error } = await supabase
        .from("transactions")
        .select("paid_amount")
        .eq("bill_id", billId)
        .not("status", "eq", "Unmatched");

      if (!error && data) {
        const totalPaid = data.reduce(
          (sum, record) => sum + (record.paid_amount || 0),
          0,
        );
        return totalPaid;
      }
      return 0;
    };

    // Update existing payments for all selected bills
    const updateExistingPayments = async () => {
      const updatedSelectedBills = new Map(selectedBills);
      const billEntries = Array.from(selectedBills.entries());
      for (const [billId, billData] of billEntries) {
        const existingPayments = await fetchExistingPayments(billId);
        updatedSelectedBills.set(billId, {
          ...billData,
          existingPayments
        });
      }
      setSelectedBills(updatedSelectedBills);
    };

    if (selectedBills.size > 0) {
      updateExistingPayments();
    }
  }, [selectedBills.size]); // Only run when bills are added/removed

  const handleBillSelection = (monthlyBill: MonthlyBill, isSelected: boolean) => {
    const updatedSelectedBills = new Map(selectedBills);
    
    if (isSelected) {
      // Check if remaining amount is 0 and prevent new selections
      if (remainingAmount <= 0) {
        toast.error("You have already allocated the full transaction amount. Please remove allocation from existing bills first.");
        return;
      }

      // Add bill to selection with initial allocated amount of 0
      updatedSelectedBills.set(monthlyBill.id, {
        bill: monthlyBill,
        allocatedAmount: 0,
        existingPayments: 0
      });
    } else {
      // Remove bill from selection and update remaining amount
      const billData = selectedBills.get(monthlyBill.id);
      if (billData) {
        setRemainingAmount(prev => prev + billData.allocatedAmount);
      }
      updatedSelectedBills.delete(monthlyBill.id);
    }
    
    setSelectedBills(updatedSelectedBills);
  };

  const handleAllocationChange = (billId: string, newAmount: number) => {
    const updatedSelectedBills = new Map(selectedBills);
    const billData = selectedBills.get(billId);
    
    if (billData) {
      const oldAmount = billData.allocatedAmount;
      const difference = newAmount - oldAmount;
      const originalBillAmount = billData.bill.total_revenue;
      
      // Check if new amount doesn't exceed original bill amount and we have enough remaining amount
      if (newAmount <= originalBillAmount && difference <= remainingAmount) {
        updatedSelectedBills.set(billId, {
          ...billData,
          allocatedAmount: newAmount
        });
        setSelectedBills(updatedSelectedBills);
        setRemainingAmount(prev => prev - difference);
      } else if (newAmount > originalBillAmount) {
        toast.error(`Allocation amount cannot exceed the original bill amount of $${originalBillAmount.toFixed(2)}`);
      }
    }
  };

  const autoDistributePayment = () => {
    if (selectedBills.size === 0) return;

    const totalAmount = bill.amount;
    const updatedSelectedBills = new Map(selectedBills);
    const billsArray = Array.from(selectedBills.entries());

    // Special case: If only 1 bill is selected, allocate full amount (up to pending)
    if (billsArray.length === 1) {
      const [billId, billData] = billsArray[0];
      const pendingAmount = calculatePendingAmount(billData.bill, billData.existingPayments);
      const allocateAmount = Math.min(pendingAmount, totalAmount, billData.bill.total_revenue);

      updatedSelectedBills.set(billId, {
        ...billData,
        allocatedAmount: allocateAmount
      });

      setSelectedBills(updatedSelectedBills);
      setRemainingAmount(totalAmount - allocateAmount);
      toast.success(`Full amount of $${allocateAmount.toFixed(2)} allocated to the bill.`);
      return;
    }

    // Special case: If 2 bills are selected, do 50/50 split
    if (billsArray.length === 2) {
      const halfAmount = totalAmount / 2;
      let remainingToDistribute = totalAmount;

      for (const [billId, billData] of billsArray) {
        const pendingAmount = calculatePendingAmount(billData.bill, billData.existingPayments);
        const allocateAmount = Math.min(pendingAmount, halfAmount, billData.bill.total_revenue);

        updatedSelectedBills.set(billId, {
          ...billData,
          allocatedAmount: allocateAmount
        });

        remainingToDistribute -= allocateAmount;
      }

      setSelectedBills(updatedSelectedBills);
      setRemainingAmount(remainingToDistribute);
      toast.success(`Amount split 50/50 between 2 bills ($${halfAmount.toFixed(2)} each).`);
      return;
    }

    // For 3+ bills: Distribute equally, with the last bill getting the remainder
    if (billsArray.length >= 3) {
      const equalShare = totalAmount / billsArray.length;
      let remainingToDistribute = totalAmount;

      // Allocate equal shares to all bills except the last one
      for (let i = 0; i < billsArray.length - 1; i++) {
        const [billId, billData] = billsArray[i];
        const pendingAmount = calculatePendingAmount(billData.bill, billData.existingPayments);
        const allocateAmount = Math.min(pendingAmount, equalShare, billData.bill.total_revenue);

        updatedSelectedBills.set(billId, {
          ...billData,
          allocatedAmount: allocateAmount
        });

        remainingToDistribute -= allocateAmount;
      }

      // Last bill gets whatever remains (can be more or less than equal share)
      const [lastBillId, lastBillData] = billsArray[billsArray.length - 1];
      const lastPendingAmount = calculatePendingAmount(lastBillData.bill, lastBillData.existingPayments);
      const lastAllocateAmount = Math.min(
        lastPendingAmount,
        remainingToDistribute,
        lastBillData.bill.total_revenue
      );

      updatedSelectedBills.set(lastBillId, {
        ...lastBillData,
        allocatedAmount: lastAllocateAmount
      });

      remainingToDistribute -= lastAllocateAmount;

      setSelectedBills(updatedSelectedBills);
      setRemainingAmount(remainingToDistribute);
      toast.success(`Amount distributed across ${billsArray.length} bills (equal shares, last bill gets remainder).`);
      return;
    }
  };

  const calculatePendingAmount = (
    bill: MonthlyBill,
    existingPayments: number,
  ) => {
    return bill.total_revenue + bill.arrears - existingPayments;
  };


  const handleReconcile = async () => {
    try {
      if (selectedBills.size === 0) {
        toast.warn("Please select at least one bill for reconciliation.");
        return;
      }

      const totalAllocated = Array.from(selectedBills.values()).reduce(
        (sum, billData) => sum + billData.allocatedAmount, 0
      );

      if (totalAllocated !== bill.amount) {
        toast.warn(`Total allocated amount ($${totalAllocated.toFixed(2)}) must equal transaction amount ($${bill.amount.toFixed(2)})`);
        return;
      }

      // Process each selected bill
      const billEntries = Array.from(selectedBills.entries());
      for (const [billId, billData] of billEntries) {
        if (billData.allocatedAmount > 0) {
          const currentPendingAmount = calculatePendingAmount(
            billData.bill,
            billData.existingPayments
          );
          const newPendingAmount = Math.max(0, currentPendingAmount - billData.allocatedAmount);
          
          await onReconcile(bill.id, billData.allocatedAmount, billId, newPendingAmount);
        }
      }

      // Store the last selected bill ID for reference
      const lastBillId = Array.from(selectedBills.keys())[0];
      localStorage.setItem("selectedBillId", lastBillId);

      toast.success(`Transaction distributed across ${selectedBills.size} bill(s) successfully.`);
      onClose(); // Close modal after successful reconciliation
    } catch (error) {
      console.error("Error during reconciliation:", error);
      toast.error("Failed to complete Transaction. Please try again.");
    }
  };
  

  const getMatchStatus = (billAmount: number, pendingAmount: number) => {
    if (billAmount <= pendingAmount) {
      if (billAmount === pendingAmount) {
        return { status: "Matched", className: "text-green-600" };
      }
      return { status: "Partially Matched", className: "text-yellow-600" };
    }
    return { status: "Overpaid", className: "text-red-600" };
  };

  return (
    <div className="fixed inset-0 z-999 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-[800px] rounded-lg bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold">Reconcile Transaction</h2>

        <div className="mb-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p>
                <strong>Transaction Amount:</strong> ${bill.amount.toFixed(2)}
              </p>
              <p>
                <strong>Remaining to Allocate:</strong> 
                <span className={remainingAmount > 0 ? "text-red-600" : "text-green-600"}>
                  ${remainingAmount.toFixed(2)}
                </span>
              </p>
            </div>
            <div className="text-right">
              <button
                onClick={autoDistributePayment}
                disabled={selectedBills.size === 0}
                className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:bg-gray-400"
              >
                Auto Distribute
              </button>
            </div>
          </div>
        </div>

        {/* Selected Bills Allocation Section */}
        {selectedBills.size > 0 && (
          <div className="mb-4">
            <h3 className="mb-2 font-semibold">Payment Allocation</h3>
            <div className="max-h-40 overflow-y-auto rounded border">
              {Array.from(selectedBills.entries()).map(([billId, billData]) => {
                const pendingAmount = calculatePendingAmount(billData.bill, billData.existingPayments);
                return (
                  <div key={billId} className="flex items-center justify-between border-b p-3 last:border-b-0">
                    <div className="flex-1">
                      <p className="font-medium">{billData.bill.site_name}</p>
                      <p className="text-sm text-gray-600">
                        Pending: ${pendingAmount.toFixed(2)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm">$</span>
                      <input
                        type="number"
                        min="0"
                        max={Math.min(billData.bill.total_revenue, remainingAmount + billData.allocatedAmount)}
                        step="0.01"
                        value={billData.allocatedAmount}
                        onChange={(e) => handleAllocationChange(billId, parseFloat(e.target.value) || 0)}
                        className="w-24 rounded border px-2 py-1 text-right"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="mb-4">
          <h3 className="mb-2 font-semibold">Available Bills For me </h3>
          <div className="max-h-60 overflow-y-auto">
            <table className="w-full">
              <thead className="sticky top-0 bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left">Select</th>
                  <th className="px-4 py-2 text-left">Site Name</th>
                  <th className="px-4 py-2 text-left">Period</th>
                  <th className="px-4 py-2 text-left">Total Due</th>
                  <th className="px-4 py-2 text-left">Pending</th>
                </tr>
              </thead>
              <tbody>
                {monthlyBills
                  .filter((monthlyBill) => monthlyBill.status !== "Matched") // Exclude only fully matched bills
                  .map((monthlyBill) => {
                    const totalDue = monthlyBill.total_revenue + monthlyBill.arrears;
                    const billData = selectedBills.get(monthlyBill.id);
                    const existingPayments = billData?.existingPayments || 0;
                    const pendingAmount = calculatePendingAmount(monthlyBill, existingPayments);
                    const isSelected = selectedBills.has(monthlyBill.id);

                    return (
                      <tr key={monthlyBill.id} className={`hover:bg-gray-50 ${isSelected ? 'bg-blue-50' : ''}`}>
                        <td className="px-4 py-2">
                          <input
                            type="checkbox"
                            onChange={(e) => handleBillSelection(monthlyBill, e.target.checked)}
                            checked={isSelected}
                            disabled={!isSelected && remainingAmount <= 0}
                            className={!isSelected && remainingAmount <= 0 ? "cursor-not-allowed opacity-50" : "cursor-pointer"}
                          />
                        </td>
                        <td className="px-4 py-2">{monthlyBill.site_name}</td>
                        <td className="px-4 py-2">
                          {new Date(monthlyBill.billing_period_start).toLocaleDateString()}{" "}
                          - {new Date(monthlyBill.billing_period_end).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-2">${totalDue.toFixed(2)}</td>
                        <td className="px-4 py-2">
                          ${pendingAmount.toFixed(2)}
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
            className={`rounded px-4 py-2 text-white ${
              selectedBills.size > 0 && remainingAmount === 0
                ? "bg-primary hover:bg-green-400"
                : "bg-gray-400 cursor-not-allowed"
            }`}
            disabled={selectedBills.size === 0 || remainingAmount !== 0}
          >
            Match ({selectedBills.size} bill{selectedBills.size !== 1 ? 's' : ''})
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

        if (text.includes("status,paidAmount,pendingAmount")) {
          const lines = text.split("\n");
          const headers = lines[0].split(",").map((h) => h.trim());
          const data: BillData[] = lines.slice(1).map((line, index) => {
            const values = line.split(",").map((v) => v.trim());
            return {
              id: index.toString(),
              date: values[headers.indexOf("date")],
              description: values[headers.indexOf("description")],
              amount: parseFloat(values[headers.indexOf("amount")]),
              status: values[headers.indexOf("status")] as BillData["status"],
              paid_amount: parseFloat(values[headers.indexOf("paidAmount")]),
              pending_amount: parseFloat(
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

  const fetchData = useCallback(async () => {
    try {
      const { data: transactions, error } = await supabase
        .from("transactions")
        .select("*")
        .order("date", { ascending: false });

      if (error) throw error;

      setMappedData(transactions || []);
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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

 const handleReconcile = async (
    transactionId: string,
    paidAmount: number,
    billId: string,
    arrearsAmount: number,
  ) => {
    try {
      // Get current bill data
      const { data: billData, error: billFetchError } = await supabase
        .from("monthly_bills")
        .select("reconciliation_ids, total_bill, pending_bill")
        .eq("id", billId)
        .single();

      if (billFetchError) throw billFetchError;

      // Calculate new pending amount
      const currentPendingBill = billData.pending_bill;
      const newPendingAmount = Math.max(0, currentPendingBill - paidAmount);

      // Update reconciliation record
      const { error: reconcileError } = await supabase
        .from("transactions")
        .update({
          status: newPendingAmount > 0 ? "Partially Matched" : "Matched",
          paid_amount: paidAmount,
          pending_amount: newPendingAmount,
          bill_id: billId,
        })
        .eq("id", transactionId);

      if (reconcileError) throw reconcileError;

      // Update reconciliation IDs array
      const existingIds = billData.reconciliation_ids || [];
      const updatedIds = Array.isArray(existingIds)
        ? [...existingIds, transactionId]
        : [transactionId];

      // Update monthly bill
      const { error: billError } = await supabase
        .from("monthly_bills")
        .update({
          pending_bill: newPendingAmount,
          arrears: newPendingAmount, // Update arrears with remaining pending amount
          reconciliation_ids: updatedIds,
          status: newPendingAmount > 0 ? "Partially Paid" : "Paid",
        })
        .eq("id", billId);

      if (billError) throw billError;

      // Success handling
      await fetchData();
      setShowReconcileModal(false);
      setSelectedBill(null);
      router.push(
        `/dashboard/billing/reconciliation?highlightId=${transactionId}`,
      );
    } catch (error) {
      console.error("Error during reconciliation:", error);
      alert("Error updating reconciliation. Please try again.");
    }
  }; 



  const handleUndo = async (transaction: BillData) => {
    try {
      // Reset reconciliation record
      const { error: reconcileError } = await supabase
        .from("transactions")
        .update({
          status: "Unmatched",
          paid_amount: 0,
          pending_amount: transaction.amount,
          bill_id: null,
        })
        .eq("id", transaction.id);
  
      if (reconcileError) throw reconcileError;
  
      // Update bill record if transaction.bill_id exists
      if (transaction.bill_id) {
        // First get the current bill data
        const { data: billData, error: billFetchError } = await supabase
          .from("monthly_bills")
          .select("*")
          .eq("id", transaction.bill_id)
          .single();
  
        if (billFetchError) throw billFetchError;
  
        // Remove the current transaction from reconciliation_ids
        const updatedReconciliationIds = (
          billData.reconciliation_ids || []
        ).filter((id: string) => id !== transaction.id);
  
        // Calculate new status and arrears
        let newStatus = "Pending";
        let newArrears = billData.total_revenue;
  
        if (updatedReconciliationIds.length > 0) {
          // If there are still other reconciled transactions, keep as Partially Matched
          newStatus = "Partially Matched";
  
          // Get all remaining reconciled transactions
          const { data: remainingTransactions, error: transactionsError } =
            await supabase
              .from("transactions")
              .select("paid_amount")
              .in("id", updatedReconciliationIds);
  
          if (transactionsError) throw transactionsError;
  
          // Calculate new arrears based on remaining reconciled amounts
          const totalPaidAmount = remainingTransactions.reduce(
            (sum: number, t: { paid_amount: number }) => sum + t.paid_amount,
            0,
          );
          if (totalPaidAmount === 0) {
            newStatus = "Unmatched";
            newArrears = 0;
          } else {
            newStatus = "Partially Matched";
            newArrears = billData.total_revenue - totalPaidAmount;
          }
        } else {
          // If there are no remaining reconciliations, ensure arrears is 0
          newStatus = "Pending";
          newArrears = 0;
        }        
  
        // Update the bill
        const { error: billUpdateError } = await supabase
          .from("monthly_bills")
          .update({
            status: newStatus,
            arrears: newArrears,
            reconciliation_ids: updatedReconciliationIds,
          })
          .eq("id", transaction.bill_id);
  
        if (billUpdateError) throw billUpdateError;
      }
  
      await fetchData();
      toast.success("The transaction has been reset successfully!");
    } catch (error) {
      console.error("Error resetting reconciliation:", error);
      toast.error("Failed to reset transaction. Please try again.");
    }
  };
  
  

  const handleDelete = async (transactionId: string) => {
    console.log("Delete button clicked for transaction:", transactionId);

    try {
      // Fetch the transaction first to verify it's unmatched
      const { data: transaction, error: fetchError } = await supabase
        .from("transactions")
        .select("status, description, amount, bill_id")
        .eq("id", transactionId)
        .single();

      console.log("Fetched transaction:", transaction);
      console.log("Fetch error:", fetchError);

      if (fetchError) {
        console.error("Error fetching transaction:", fetchError);
        toast.error(`Failed to fetch transaction: ${fetchError.message || 'Unknown error'}`);
        return;
      }

      if (!transaction) {
        toast.error("Transaction not found");
        return;
      }

      // Safety check: only allow deletion of unmatched transactions
      if (transaction.status !== "Unmatched") {
        console.log(`Transaction status is ${transaction.status}, not Unmatched`);
        toast.error(
          `Cannot delete a ${transaction.status.toLowerCase()} transaction. Please undo it first.`
        );
        return;
      }

      // Additional safety check: verify bill_id is null
      if (transaction.bill_id) {
        console.log("Transaction has bill_id:", transaction.bill_id);
        toast.error("This transaction is linked to a bill. Please undo it first.");
        return;
      }

      // Show confirmation dialog
      const confirmed = window.confirm(
        `Are you sure you want to delete this transaction?\n\nDescription: ${transaction.description}\nAmount: $${transaction.amount.toFixed(2)}\n\nThis action cannot be undone.`
      );

      console.log("User confirmed deletion:", confirmed);

      if (!confirmed) {
        console.log("User canceled deletion");
        return;
      }

      // Delete the transaction
      console.log("Attempting to delete transaction from database...");
      const { error: deleteError } = await supabase
        .from("transactions")
        .delete()
        .eq("id", transactionId);

      console.log("Delete error:", deleteError);

      if (deleteError) {
        console.error("Error deleting transaction:", deleteError);
        toast.error(`Failed to delete transaction: ${deleteError.message || 'Database error'}`);
        return;
      }

      console.log("Transaction deleted successfully, refreshing data...");
      await fetchData();
      toast.success("Transaction deleted successfully.");
    } catch (error) {
      console.error("Unexpected error deleting transaction:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      toast.error(`Error deleting transaction: ${errorMessage}`);
    }
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
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

  const filteredData =
    activeTab === "all"
      ? mappedData
      : mappedData.filter(
          (item) => item.status.toLowerCase().replace(" ", "-") === activeTab,
        );

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
                          className="inline-flex items-center justify-center rounded-lg bg-primary hover:bg-green-400 px-4 py-2 text-base font-medium text-white"
                          onClick={() => {
                            setSelectedBill(row);
                            setShowReconcileModal(true);
                          }}
                        >
                          Match
                        </button>

                        {/* Delete Button */}
                        <button
                          className="inline-flex items-center justify-center rounded-lg bg-red-500 hover:bg-red-400 px-4 py-2 text-base font-medium text-white"
                          onClick={() => handleDelete(row.id)}
                        >
                          Delete
                        </button>
                      </div>
                    ) : (
                      <div className="flex justify-end space-x-3">
                        {/* View Bill Button */}
                        <button
                          className="inline-flex items-center justify-center rounded-lg bg-dark-2 hover:bg-dark-3 px-4 py-2 text-base font-medium text-white"
                          onClick={() =>
                            router.push(
                              `/dashboard/billing/monthly?highlightId=${row.bill_id}`,
                            )
                          }
                        >
                          View Bill
                        </button>

                        {/* Undo Button */}
                        <button
                          className="inline-flex items-center justify-center rounded-lg bg-yellow-400 hover:bg-yellow-300 px-4 py-2 text-base font-medium text-white"
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
          }}
          onReconcile={handleReconcile}
        />
      )}
    </div>
  );
};

export default Reconciliation;