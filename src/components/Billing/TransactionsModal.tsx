import React, { useEffect, useState } from "react";
import { supabase } from "@/utils/supabase/browserClient";

interface Transaction {
  [x: string]: any;
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

interface AllocationData {
  transaction_id: string;
  allocated_amount: number;
}

interface TransactionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: Transaction[];
  billId?: string;
}

const TransactionsModal = ({
  isOpen,
  onClose,
  transactions,
  billId,
}: TransactionsModalProps) => {
  const [allocations, setAllocations] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAllocations = async () => {
      if (!billId || transactions.length === 0) {
        setLoading(false);
        return;
      }

      try {
        const transactionIds = transactions.map(t => t.id);

        // Fetch allocation amounts for all transactions for this bill
        const { data, error } = await supabase
          .from("transaction_bill_allocations")
          .select("transaction_id, allocated_amount")
          .eq("bill_id", billId)
          .in("transaction_id", transactionIds);

        if (error) throw error;

        // Create a map of transaction_id -> allocated_amount
        const allocationMap = new Map<string, number>();
        data?.forEach((allocation: AllocationData) => {
          allocationMap.set(allocation.transaction_id, allocation.allocated_amount);
        });

        setAllocations(allocationMap);
      } catch (error) {
        console.error("Error fetching allocations:", error);
      } finally {
        setLoading(false);
      }
    };

    if (isOpen) {
      fetchAllocations();
    }
  }, [isOpen, billId, transactions]);

  if (!isOpen) return null;

  // Calculate over_balance (cumulative overpayment) for each row
  const transactionsWithOverBalance = transactions.map((transaction, index) => {
    // Get the exact allocated amount for this transaction
    const allocatedAmount = allocations.get(transaction.id) || transaction.paid_amount;

    // Calculate over_balance: sum of all previous overpayments
    let overBalance = 0;
    for (let i = 0; i <= index; i++) {
      const txn = transactions[i];
      const allocatedAmt = allocations.get(txn.id) || txn.paid_amount;
      const transactionTotal = txn.amount;
      const overpayment = allocatedAmt - transactionTotal;
      if (overpayment > 0) {
        overBalance += overpayment;
      }
    }

    return {
      ...transaction,
      allocatedAmount,
      overBalance
    };
  });

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-9999 flex items-center justify-center overflow-y-auto overflow-x-hidden bg-slate-300/50 outline-none backdrop-blur-sm focus:outline-none"
    >
      <div
        className="relative mx-auto my-6 w-full max-w-6xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative flex w-full flex-col rounded-lg border-0 bg-white shadow-lg outline-none focus:outline-none dark:bg-gray-dark">
          {/* Header */}
          <div className="flex items-center justify-between rounded-t border-b border-stroke p-5 dark:border-dark-3">
            <h3 className="text-xl font-semibold text-dark dark:text-white">
              Transaction Details
            </h3>
            <button
              className="ml-auto border-0 p-1 text-3xl font-semibold leading-none text-dark-6 outline-none hover:text-dark focus:outline-none dark:text-white"
              onClick={onClose}
            >
              ×
            </button>
          </div>

          {/* Content */}
          <div className="relative max-h-[70vh] overflow-y-auto p-6">
            {loading ? (
              <div className="flex justify-center items-center py-8">
                <div className="text-gray-500">Loading allocation details...</div>
              </div>
            ) : (
              <div className="rounded-[10px] border border-stroke bg-white shadow-1 dark:border-dark-3 dark:bg-gray-dark">
                <div className="max-w-full overflow-x-auto">
                  <table className="w-full table-auto">
                    <thead>
                      <tr className="border-b border-stroke bg-gray-2 dark:border-dark-3 dark:bg-dark-2">
                        <th className="px-6.5 py-4 text-left text-sm font-medium text-dark dark:text-white">
                          Date
                        </th>
                        <th className="px-6.5 py-4 text-left text-sm font-medium text-dark dark:text-white">
                          Description
                        </th>
                        <th className="px-6.5 py-4 text-left text-sm font-medium text-dark dark:text-white">
                          Amount Paid
                        </th>
                        <th className="px-6.5 py-4 text-left text-sm font-medium text-dark dark:text-white">
                          Over Balance
                        </th>
                        <th className="px-6.5 py-4 text-left text-sm font-medium text-dark dark:text-white">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactionsWithOverBalance.map((transaction) => (
                        <tr
                          key={transaction.id}
                          className="border-b border-stroke dark:border-dark-3"
                        >
                          <td className="px-6.5 py-4 text-sm dark:text-white">
                            {new Date(transaction.date).toLocaleDateString()}
                          </td>
                          <td className="px-6.5 py-4 text-sm dark:text-white">
                            {transaction.description}
                          </td>
                          <td className="px-6.5 py-4 text-sm font-semibold dark:text-white">
                            ${transaction.allocatedAmount.toFixed(2)}
                          </td>
                          <td className="px-6.5 py-4 text-sm dark:text-white">
                            <span className={transaction.overBalance > 0 ? "text-green-600 font-semibold" : ""}>
                              ${transaction.overBalance.toFixed(2)}
                            </span>
                          </td>
                          <td className="px-6.5 py-4 text-sm dark:text-white">
                            <span
                              className={`inline-flex rounded-full px-3 py-1 text-sm font-medium ${
                                transaction.status.toLowerCase() === "matched"
                                  ? "bg-success/10 text-success"
                                  : transaction.status.toLowerCase() === "partially matched"
                                    ? "bg-warning/10 text-warning"
                                    : "bg-danger/10 text-danger"
                              }`}
                            >
                              {transaction.status}
                            </span>
                          </td>
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
    </div>
  );
};

export default TransactionsModal;