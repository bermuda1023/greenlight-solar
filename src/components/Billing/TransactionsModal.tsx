import React from 'react';

interface Transaction {
  [x: string]: any;
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

interface TransactionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: Transaction[];
}

const TransactionsModal = ({ isOpen, onClose, transactions }: TransactionsModalProps) => {
  if (!isOpen) return null;

  return (
    <div onClick={onClose} className="fixed inset-0 z-9999 bg-slate-300/50 backdrop-blur-sm flex items-center justify-center overflow-y-auto overflow-x-hidden outline-none focus:outline-none">
      <div className="relative mx-auto my-6 w-full max-w-6xl" onClick={(e) => e.stopPropagation()}>
        <div className="relative flex w-full flex-col rounded-lg border-0 bg-white shadow-lg outline-none focus:outline-none dark:bg-gray-dark">
          {/* Header */}
          <div className="flex items-center justify-between rounded-t border-b border-stroke p-5 dark:border-dark-3">
            <h3 className="text-xl font-semibold text-dark dark:text-white">
              Transaction Details
            </h3>
            <button
              className="text-dark-6 hover:text-dark ml-auto border-0 p-1 text-3xl font-semibold leading-none outline-none focus:outline-none dark:text-white"
              onClick={onClose}
            >
              ×
            </button>
          </div>
          
          {/* Content */}
          <div className="relative max-h-[70vh] overflow-y-auto p-6">
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
                        Total Amount
                      </th>
                      <th className="px-6.5 py-4 text-left text-sm font-medium text-dark dark:text-white">
                        Paid Amount
                      </th>
                      <th className="px-6.5 py-4 text-left text-sm font-medium text-dark dark:text-white">
                        Pending Amount
                      </th>
                      <th className="px-6.5 py-4 text-left text-sm font-medium text-dark dark:text-white">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((transaction) => (
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
                        <td className="px-6.5 py-4 text-sm dark:text-white">
                        ${transaction.total_bill.toFixed(2)}
                        </td>
                        <td className="px-6.5 py-4 text-sm dark:text-white">
                          ${transaction.paid_amount.toFixed(2)}
                        </td>
                        <td className="px-6.5 py-4 text-sm dark:text-white">
                          ${transaction.pending_amount.toFixed(2)}
                        </td>
                        <td className="px-6.5 py-4 text-sm dark:text-white">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-sm font-medium ${
                              transaction.status.toLowerCase() === "completed"
                                ? "bg-success/10 text-success"
                                : transaction.status.toLowerCase() === "pending"
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
          </div>
        </div>
      </div>
    </div>
  );
};

export default TransactionsModal;