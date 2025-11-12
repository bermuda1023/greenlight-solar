
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
  reference_no?: string;
}

interface MonthlyBill {
  id: string;
  site_name: string;
  billing_period_start: string;
  billing_period_end: string;
  total_revenue: number;
  total_bill: number;
  status: string;
  arrears: number;
  paid_amount: number;
  pending_bill?: number;
  pending_balance: number;
  customer_id: string;
  last_overdue?: number;
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
  const [selectedBills, setSelectedBills] = useState<Map<string, { bill: MonthlyBill; allocatedAmount: number; existingPayments: number }>>(new Map());
  const [remainingAmount, setRemainingAmount] = useState<number>(bill.amount);
  const [customerSearchQuery, setCustomerSearchQuery] = useState<string>("");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const reconciliationService = useMemo(() => new ReconciliationService(), []);

  const router = useRouter();
  // const handleBillSelection = async (monthlyBill: MonthlyBill) => {
  //     // Get the current customer balance
  // const customerBalance = await billingService.getCustomerBalance(monthlyBill.customer_id);

  //   setLocalSelectedBillId(monthlyBill.id);
  // setLocalSelectedMonthlyBill({
  //   ...monthlyBill,
  //   pending_balance: customerBalance // Use the accurate customer balance
  // });
  //   setSelectedBillId(monthlyBill.id);
  //   setSelectedMonthlyBill(monthlyBill);
  // };
  
// eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    // Fetch existing payments for all selected bills
    const fetchExistingPayments = async (billId: string) => {
      // For ReconciliationTest, we'll calculate existing payments differently
      // You can adjust this based on your actual data structure
      try {
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
      } catch (error) {
        console.error("Error fetching existing payments:", error);
        return 0;
      }
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

  const handleBillSelection = async (monthlyBill: MonthlyBill, isSelected: boolean) => {
    const updatedSelectedBills = new Map(selectedBills);

    if (isSelected) {
      // Check if a different customer is already selected
      if (selectedCustomerId && selectedCustomerId !== monthlyBill.customer_id) {
        const currentCustomerBill = Array.from(selectedBills.values())[0]?.bill;
        toast.error(
          `Cannot select bills from multiple customers. You have already selected bills for ${currentCustomerBill?.site_name}. Please clear the current selection first.`,
          { autoClose: 5000 }
        );
        return;
      }

      // Check if remaining amount is 0 and prevent new selections
      if (remainingAmount <= 0) {
        toast.error("You have already allocated the full transaction amount. Please remove allocation from existing bills first.");
        return;
      }

      // Add bill to selection with initial allocated amount of 0
      // Do NOT modify the bill data - use it as-is to keep pending amounts consistent
      updatedSelectedBills.set(monthlyBill.id, {
        bill: monthlyBill,
        allocatedAmount: 0,
        existingPayments: 0
      });

      // Set the selected customer ID if this is the first selection
      if (!selectedCustomerId) {
        setSelectedCustomerId(monthlyBill.customer_id);
      }

      // Update parent component state for backward compatibility
      setSelectedBillId(monthlyBill.id);
      setSelectedMonthlyBill(monthlyBill);
    } else {
      // Remove bill from selection and update remaining amount
      const billData = selectedBills.get(monthlyBill.id);
      if (billData) {
        setRemainingAmount(prev => prev + billData.allocatedAmount);
      }
      updatedSelectedBills.delete(monthlyBill.id);

      // Clear selected customer ID if no bills are selected
      if (updatedSelectedBills.size === 0) {
        setSelectedCustomerId(null);
        setSelectedBillId(null);
        setSelectedMonthlyBill(null);
      }
    }

    setSelectedBills(updatedSelectedBills);
  };

  const autoDistributePayment = () => {
    if (selectedBills.size === 0) return;

    const totalAmount = bill.amount;
    const updatedSelectedBills = new Map(selectedBills);
    const billsArray = Array.from(selectedBills.entries());

    // Special case: If only 1 bill is selected, allocate full amount (up to pending)
    if (billsArray.length === 1) {
      const [billId, billData] = billsArray[0];
      const pendingAmount = calculatePendingAmount(billData.bill, 0);
      const originalBillAmount = billData.bill.total_bill || billData.bill.total_revenue;
      const allocateAmount = Math.min(pendingAmount, totalAmount, originalBillAmount);

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
        const pendingAmount = calculatePendingAmount(billData.bill, 0);
        const originalBillAmount = billData.bill.total_bill || billData.bill.total_revenue;
        const allocateAmount = Math.min(pendingAmount, halfAmount, originalBillAmount);

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
        const pendingAmount = calculatePendingAmount(billData.bill, 0);
        const originalBillAmount = billData.bill.total_bill || billData.bill.total_revenue;
        const allocateAmount = Math.min(pendingAmount, equalShare, originalBillAmount);

        updatedSelectedBills.set(billId, {
          ...billData,
          allocatedAmount: allocateAmount
        });

        remainingToDistribute -= allocateAmount;
      }

      // Last bill gets whatever remains (can be more or less than equal share)
      const [lastBillId, lastBillData] = billsArray[billsArray.length - 1];
      const lastPendingAmount = calculatePendingAmount(lastBillData.bill, 0);
      const lastOriginalBillAmount = lastBillData.bill.total_bill || lastBillData.bill.total_revenue;
      const lastAllocateAmount = Math.min(
        lastPendingAmount,
        remainingToDistribute,
        lastOriginalBillAmount
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

      // Prepare matched bills array for the service
      const matchedBills = Array.from(selectedBills.entries()).map(([billId, billData]) => ({
        billId,
        amount: billData.allocatedAmount
      })).filter(match => match.amount > 0);

      await reconciliationService.matchTransactionToBills(bill.id, matchedBills);

      toast.success(`Transaction distributed across ${selectedBills.size} bill(s) successfully.`);
      onReconcileComplete();  // Trigger data refresh in the parent component
      onClose();  // Close the modal

    } catch (error) {
      console.error("Error during reconciliation:", error);
      toast.error("Failed to match transaction");
    }
  };
  
  

  // Function to calculate the pending amount
  const calculatePendingAmount = (monthlyBill: MonthlyBill, allocatedAmount: number = 0): number => {
    // Use total_bill (which includes revenue + arrears + interest) with fallback to total_revenue + arrears
    const totalDue = monthlyBill.total_bill || (monthlyBill.total_revenue + (monthlyBill.arrears || 0));
    const paidAmount = monthlyBill.paid_amount || 0;
    return Math.max(0, totalDue - paidAmount - allocatedAmount);
  };

  // Filter monthly bills based on customer search query
  const filteredMonthlyBills = useMemo(() => {
    if (!customerSearchQuery.trim()) {
      return monthlyBills;
    }
    const query = customerSearchQuery.toLowerCase();
    return monthlyBills.filter((bill) =>
      bill.site_name.toLowerCase().includes(query) ||
      bill.customer_id.toLowerCase().includes(query)
    );
  }, [monthlyBills, customerSearchQuery]);

  return (
    <div className="fixed inset-0 z-999 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="w-full max-w-6xl max-h-[90vh] overflow-y-auto rounded-lg bg-white shadow-2xl">
        {/* Modal Header */}
        <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Reconcile Transaction</h2>
              <p className="text-sm text-gray-500 mt-1">Match payment to customer bills</p>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-2 hover:bg-gray-100 transition-colors"
              aria-label="Close modal"
            >
              <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Modal Content */}
        <div className="px-6 py-4">

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
              {selectedCustomerId && (
                <div className="mt-2 inline-flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-1.5 border border-blue-200">
                  <span className="text-sm font-medium text-blue-900">
                    Selected Customer:
                  </span>
                  <span className="text-sm font-semibold text-blue-700">
                    {Array.from(selectedBills.values())[0]?.bill.site_name}
                  </span>
                </div>
              )}
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
                const pendingAmount = calculatePendingAmount(billData.bill, billData.allocatedAmount);
                return (
                  <div key={billId} className="flex items-center justify-between border-b p-3 last:border-b-0">
                    <div className="flex-1">
                      <p className="font-medium">{billData.bill.site_name}</p>
                      <p className="text-sm text-gray-600">
                        Bill Pending: ${pendingAmount.toFixed(2)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm">$</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={billData.allocatedAmount || ""}
                        onChange={(e) => {
                          const value = e.target.value;
                          const updatedSelectedBills = new Map(selectedBills);
                          const currentBillData = selectedBills.get(billId);

                          if (currentBillData) {
                            const oldAmount = currentBillData.allocatedAmount;
                            const newAmount = value === "" ? 0 : parseFloat(value) || 0;
                            const difference = newAmount - oldAmount;

                            // Allow free typing - update without validation
                            updatedSelectedBills.set(billId, {
                              ...currentBillData,
                              allocatedAmount: newAmount
                            });
                            setSelectedBills(updatedSelectedBills);
                            setRemainingAmount(prev => prev - difference);
                          }
                        }}
                        onBlur={(e) => {
                          // Validate only when user finishes editing (loses focus)
                          const value = e.target.value;
                          const newAmount = value === "" ? 0 : parseFloat(value) || 0;
                          const currentBillData = selectedBills.get(billId);

                          if (currentBillData) {
                            // Use total_bill for validation with fallback to total_revenue
                            const originalBillAmount = currentBillData.bill.total_bill || currentBillData.bill.total_revenue;
                            const oldAmount = currentBillData.allocatedAmount;
                            const maxAvailable = remainingAmount + oldAmount;

                            // Check if exceeds bill amount
                            if (newAmount > originalBillAmount) {
                              toast.error(`Allocation amount cannot exceed the total bill amount of $${originalBillAmount.toFixed(2)}`);
                              // Reset to old amount
                              const updatedSelectedBills = new Map(selectedBills);
                              updatedSelectedBills.set(billId, {
                                ...currentBillData,
                                allocatedAmount: oldAmount
                              });
                              setSelectedBills(updatedSelectedBills);
                              return;
                            }

                            // Check if exceeds available amount
                            if (newAmount > maxAvailable) {
                              toast.error(`Not enough remaining amount. Available: $${maxAvailable.toFixed(2)}`);
                              // Reset to old amount
                              const updatedSelectedBills = new Map(selectedBills);
                              const difference = newAmount - oldAmount;
                              updatedSelectedBills.set(billId, {
                                ...currentBillData,
                                allocatedAmount: oldAmount
                              });
                              setSelectedBills(updatedSelectedBills);
                              setRemainingAmount(prev => prev + difference); // Restore the remaining amount
                              return;
                            }
                          }
                        }}
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
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">Available Bills</h3>
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Search customer name..."
                value={customerSearchQuery}
                onChange={(e) => setCustomerSearchQuery(e.target.value)}
                className="px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
              {customerSearchQuery && (
                <button
                  onClick={() => setCustomerSearchQuery("")}
                  className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
                >
                  Clear
                </button>
              )}
              <span className="text-xs text-gray-500">
                {filteredMonthlyBills.length} of {monthlyBills.length}
              </span>
            </div>
          </div>
          <div className="max-h-60 overflow-y-auto">
            <table className="w-full">
              <thead className="sticky top-0 bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium uppercase">Select</th>
                  <th className="px-4 py-2 text-left text-xs font-medium uppercase">Site Name</th>
                  <th className="px-4 py-2 text-left text-xs font-medium uppercase">Last Overdue</th>
                  <th className="px-4 py-2 text-left text-xs font-medium uppercase min-w-[200px]">Billing Period</th>
                  <th className="px-4 py-2 text-left text-xs font-medium uppercase">Total Bill ($)</th>
                  <th className="px-4 py-2 text-left text-xs font-medium uppercase">Bill Paid ($)</th>
                  <th className="px-4 py-2 text-left text-xs font-medium uppercase">Pending Bill ($)</th>
                  <th className="px-4 py-2 text-left text-xs font-medium uppercase">Allocate</th>
                </tr>
              </thead>
              <tbody>
                {filteredMonthlyBills.map((monthlyBill) => {
                  const billData = selectedBills.get(monthlyBill.id);
                  const existingPayments = billData?.existingPayments || 0;
                  // Use the updated bill data if selected, otherwise use original
                  const displayBill = billData ? billData.bill : monthlyBill;
                  const allocatedAmount = billData?.allocatedAmount || 0;

                  // Get initial pending from database, then subtract any current allocation
                  const initialPending = monthlyBill.pending_bill !== undefined
                    ? monthlyBill.pending_bill
                    : calculatePendingAmount(monthlyBill, 0);
                  const pendingAmount = Math.max(0, initialPending - allocatedAmount);

                  const paidAmount = monthlyBill.paid_amount || 0;
                  const isSelected = selectedBills.has(monthlyBill.id);
                  const lastOverdue = monthlyBill.last_overdue || 0;

                  // Check if bill is fully paid (pending amount = 0)
                  const isFullyPaid = pendingAmount <= 0;

                  // Check if this bill belongs to a different customer than the selected one
                  const isDifferentCustomer = !!(selectedCustomerId && selectedCustomerId !== monthlyBill.customer_id);
                  const isDisabled = (!isSelected && remainingAmount <= 0) || isDifferentCustomer || isFullyPaid;

                  // Format billing period dates
                  const startDate = new Date(monthlyBill.billing_period_start).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  });
                  const endDate = new Date(monthlyBill.billing_period_end).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  });

                  return (
                    <tr key={monthlyBill.id} className={`hover:bg-gray-50 ${isSelected ? 'bg-blue-50' : ''} ${isDifferentCustomer || isFullyPaid ? 'opacity-50 bg-gray-50' : ''}`}>
                      <td className="px-4 py-2">
                        <input
                          type="checkbox"
                          onChange={(e) => handleBillSelection(monthlyBill, e.target.checked)}
                          checked={isSelected}
                          disabled={isDisabled}
                          className={isDisabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"}
                        />
                      </td>
                      <td className="px-4 py-2">
                        <div className={`font-medium ${isDifferentCustomer || isFullyPaid ? 'text-gray-400' : ''}`}>
                          {monthlyBill.site_name}
                          {isDifferentCustomer && (
                            <span className="ml-2 text-xs text-gray-500">(Different Customer)</span>
                          )}
                          {isFullyPaid && !isSelected && (
                            <span className="ml-2 text-xs text-green-600">(Fully Paid)</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-2">
                        <span className={`font-semibold ${
                          lastOverdue > 0 ? 'text-red-600' : 'text-green-600'
                        } ${isDifferentCustomer ? 'opacity-50' : ''}`}>
                          ${lastOverdue.toFixed(2)}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-sm whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="font-medium text-gray-900">{startDate}</span>
                          <span className="text-xs text-gray-500">to {endDate}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2 font-semibold">${(monthlyBill.total_bill || monthlyBill.total_revenue).toFixed(2)}</td>
                      <td className="px-4 py-2">${paidAmount.toFixed(2)}</td>
                      <td className="px-4 py-2 font-semibold">
                        ${pendingAmount.toFixed(2)}
                      </td>
                      <td className="px-4 py-2">
                        {isFullyPaid && !isSelected ? (
                          <span className="inline-flex rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-800">
                            Paid
                          </span>
                        ) : isSelected ? (
                          <span className="font-medium text-gray-900">
                            ${allocatedAmount.toFixed(2)}
                          </span>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-lg bg-gray-200 hover:bg-gray-300 font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleReconcile}
            className={`px-6 py-2.5 rounded-lg font-medium transition-colors ${
              selectedBills.size > 0 && remainingAmount === 0
                ? "bg-primary hover:bg-green-400 text-white"
                : "bg-gray-400 text-white cursor-not-allowed"
            }`}
            disabled={selectedBills.size === 0 || remainingAmount !== 0}
          >
            Match ({selectedBills.size} bill{selectedBills.size !== 1 ? 's' : ''})
          </button>
        </div>
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
  const [searchQuery, setSearchQuery] = useState<string>("");

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
      // Reset the file input so the same file can be selected again
      event.target.value = "";
    } else {
      alert("Please upload a valid CSV file.");
    }
  };

  const cleanReferenceNumber = (refNo: string): string => {
    if (!refNo) return "";

    // Remove all types of quotes (single, double, backticks)
    let cleaned = refNo.replace(/['"`]/g, "");

    // Remove any leading/trailing whitespace
    cleaned = cleaned.trim();

    // Remove any special characters that might have been added during export
    // Keep only alphanumeric, hyphens, and underscores
    cleaned = cleaned.replace(/[^\w\-]/g, "");

    return cleaned;
  };

  const parseBankStatementDate = (dateStr: string): string => {
    // Parse DD-MMM-YY format (e.g., "31-Oct-25")
    const months: { [key: string]: number } = {
      'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
      'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
    };

    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const day = parseInt(parts[0]);
      const monthStr = parts[1];
      const year = parseInt(parts[2]) + 2000; // Convert 25 to 2025

      const month = months[monthStr];
      if (month !== undefined) {
        const date = new Date(year, month, day);
        // Return in YYYY-MM-DD format for database
        return date.toISOString().split('T')[0];
      }
    }
    return dateStr; // Return as-is if parsing fails
  };

  const handleMapping = async () => {
    try {
      // Extract reference numbers from CSV data
      const referenceNumbers = csvData
        .map(row => row["ReferenceNo"])
        .filter(ref => ref && ref.trim() !== "");

      // Check for duplicates in database using reference numbers
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
        paid_amount: 0,
        pending_amount: parseFloat(row["Amount"]),
      }));

      const { error } = await supabase
        .from("transactions")
        .insert(processedData);

      if (error) throw error;

      await fetchData();
      setShowMappingModal(false);
      // Clear CSV data after successful import
      setCSVData([]);
      toast.success(`Successfully imported ${processedData.length} credit transactions`);
    } catch (error) {
      console.error("Error uploading transactions:", error);
      toast.error("Error saving transactions. Please try again.");
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

  const parseCSV = (text: string) => {
    console.log("=== CSV PARSING DEBUG ===");
    const lines = text.split("\n").filter((line) => line.trim());
    console.log(`Total lines: ${lines.length}`);

    if (lines.length === 0) return;

    // Log first few lines to understand structure
    console.log("First 5 lines:");
    lines.slice(0, 5).forEach((line, i) => {
      console.log(`Line ${i}:`, line.substring(0, 150));
    });

    // Skip first 4 rows (account info, opening balance, closing balance, and column headers)
    // Data starts at row 5 (index 4)
    const dataLines = lines.slice(4);
    console.log(`Data lines after skipping 4 rows: ${dataLines.length}`);

    const data: CSVRow[] = [];

    dataLines.forEach((line, index) => {
      // Try to detect delimiter - check if line has tabs or commas
      const hasTab = line.includes("\t");
      const delimiter = hasTab ? "\t" : ",";

      const values = line.split(delimiter).map((value) => {
        // Trim whitespace and remove surrounding quotes (single or double)
        let cleaned = value.trim();
        if ((cleaned.startsWith("'") && cleaned.endsWith("'")) ||
            (cleaned.startsWith('"') && cleaned.endsWith('"'))) {
          cleaned = cleaned.slice(1, -1);
        }
        return cleaned;
      });

      // Debug first row
      if (index === 0) {
        console.log(`Detected delimiter: ${delimiter === "\t" ? "TAB" : "COMMA"}`);
        console.log(`Columns in first data row: ${values.length}`);
        console.log("First 8 column values:", values.slice(0, 8));
      }

      // Column A (index 0): Transaction Date
      // Column C (index 2): Description
      // Column E (index 4): Credit Amount
      // Column G (index 6): Reference Number
      const transactionDate = values[0] || "";
      const description = values[2] || "";
      const creditAmount = values[4] || "";
      const referenceNumber = values[6] || "";

      // Debug every row to see what we're getting
      if (index < 3) {
        console.log(`Row ${index}:`, {
          date: transactionDate,
          desc: description?.substring(0, 30),
          credit: creditAmount,
          ref: referenceNumber
        });
      }

      // Only process rows where credit amount exists and is not empty
      // Ignore debit transactions (only process credits)
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

    console.log(`Total credit transactions found: ${data.length}`);
    if (data.length > 0) {
      console.log("Sample transaction:", data[0]);
    }
    console.log("=== END DEBUG ===");

    setCSVData(data);
  };

  const handleModalClose = () => {
    setShowMappingModal(false);
    // Clear CSV data when modal is closed without importing
    setCSVData([]);
  };

  const MappingModal: React.FC<{
    onClose: () => void;
    onConfirm: () => void;
    csvData: CSVRow[];
  }> = ({
    onClose,
    onConfirm,
    csvData,
  }) => (
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
                No credit transactions found in the file. Please ensure:
              </p>
              <ul className="mt-2 list-inside list-disc text-sm text-red-700">
                <li>The file has the correct bank statement format</li>
                <li>There are credit amounts in column E</li>
                <li>Data starts after the first 4 header rows</li>
              </ul>
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
            className="rounded bg-primary px-4 py-2 text-white hover:bg-green-400 disabled:bg-gray-400 disabled:cursor-not-allowed"
            onClick={onConfirm}
            disabled={csvData.length === 0}
          >
            Import {csvData.length} Transaction{csvData.length !== 1 ? 's' : ''}
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
    let filtered = [...mappedData]; // Create a new array to avoid mutating the original

    // Filter by tab (status)
    switch (activeTab) {
      case "matched":
        filtered = filtered.filter((item) => item.status === "Matched");
        break;
      case "partially-matched":
        filtered = filtered.filter((item) => item.status === "Partially Matched");
        break;
      case "unmatched":
        filtered = filtered.filter((item) => item.status === "Unmatched");
        break;
      default:
        break;
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((item) =>
        item.description.toLowerCase().includes(query) ||
        item.reference_no?.toLowerCase().includes(query) ||
        item.amount.toString().includes(query) ||
        item.date.includes(query)
      );
    }

    // Sort by date (latest first) - ensure consistent sorting
    filtered.sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return dateB - dateA; // Descending order (latest first)
    });

    return filtered;
  }, [activeTab, mappedData, searchQuery]);

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
          <h3 className="text-sm font-medium text-gray-500">Total Transactions</h3>
          <p className="mt-2 text-3xl font-semibold">{mappedData.length}</p>
        </div>
        <div className="rounded-lg bg-white p-6 shadow">
          <h3 className="text-sm font-medium text-gray-500">Matched Transaction</h3>
          <p className="mt-2 text-3xl font-semibold text-green-600">
            {mappedData.filter((item) => item.status === "Matched").length}
          </p>
        </div>

        <div className="rounded-lg bg-white p-6 shadow">
          <h3 className="text-sm font-medium text-gray-500">Unmatched Transactions</h3>
          <p className="mt-2 text-3xl font-semibold text-red-600">
            {mappedData.filter((item) => item.status === "Unmatched").length}
          </p>
        </div>
      </div>

      {/* Tabs and Table */}
      <div className="mt-8 rounded-lg bg-white shadow">
        <div className="border-b px-4">
          <nav className="-mb-px flex">
            {["all", "matched", "unmatched"].map((tab) => (
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
                Transactions
              </button>
            ))}
          </nav>
        </div>

        {/* Search Bar */}
        <div className="px-6 py-4 border-b bg-gray-50">
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search by description, reference number, amount, or date..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 transition"
              >
                Clear
              </button>
            )}
            <div className="text-sm text-gray-600">
              Showing {filteredData.length} transaction{filteredData.length !== 1 ? 's' : ''}
            </div>
          </div>
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
                  Ref No
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Amount ($)
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Paid ($)
                </th>
                {/* <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Pending ($)
                </th> */}
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
                  <td className="whitespace-nowrap px-6 py-4">{row.reference_no || "-"}</td>
                  <td className="whitespace-nowrap px-6 py-4">
                    {row.amount.toFixed(2)}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    {row.paid_amount.toFixed(2)}
                  </td>
                  {/* <td className="whitespace-nowrap px-6 py-4">
                    {row.pending_amount.toFixed(2)}
                  </td> */}
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
          onClose={handleModalClose}
          onConfirm={handleMapping}
          csvData={csvData}
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