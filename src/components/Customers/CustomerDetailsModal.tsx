"use client";
import React, { useState, useEffect } from "react";
import { supabase } from "@/utils/supabase/browserClient";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faTimes,
  faCheckCircle,
  faTimesCircle,
  faExclamationTriangle,
} from "@fortawesome/free-solid-svg-icons";

interface CustomerDetailsModalProps {
  customerId: string;
  customerName: string;
  onClose: () => void;
}

interface MonthlyBill {
  id: string;
  invoice_number: string;
  billing_period_start: string;
  billing_period_end: string;
  total_revenue: number;
  total_bill: number;
  created_at: string;
  interest: number;
  last_overdue: number;
}

interface LogEntry {
  id: string;
  log_date: string;
  status: string;
  error_type: string | null;
  error_message: string | null;
  api_response: any;
  production_kwh: number | null;
  consumption_kwh: number | null;
  feed_in_kwh: number | null;
  self_consumption_kwh: number | null;
  http_status_code: number | null;
  created_at: string;
}

const CustomerDetailsModal: React.FC<CustomerDetailsModalProps> = ({
  customerId,
  customerName,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<"billing" | "logs">("billing");
  const [billingHistory, setBillingHistory] = useState<MonthlyBill[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedLog, setExpandedLog] = useState<string | null>(null);

  useEffect(() => {
  fetchBillingHistory();
}, [customerId]); // Always fetch billing when a new customer is opened

useEffect(() => {
  if (activeTab === "logs") {
    fetchLogs();
  }
}, [activeTab, customerId]);


  const fetchBillingHistory = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("monthly_bills")
        .select("*")
        .eq("customer_id", customerId)
        .order("billing_period_end", { ascending: false });

      if (error) throw error;
      setBillingHistory(data || []);
    } catch (error) {
      console.error("Error fetching billing history:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("logs")
        .select("*")
        .eq("customer_id", customerId)
        .order("log_date", { ascending: false })
        .limit(30); // Last 30 days

      if (error) throw error;
      setLogs(data || []);
    } catch (error) {
      console.error("Error fetching logs:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    if (status === "success") {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800">
          <FontAwesomeIcon icon={faCheckCircle} className="h-3 w-3" />
          Success
        </span>
      );
    } else if (status === "failure") {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-md bg-red-50 px-2.5 py-1 text-xs font-medium text-red-800">
          <FontAwesomeIcon icon={faTimesCircle} className="h-3 w-3" />
          Failure
        </span>
      );
    }
    return <span className="text-xs text-gray-500">Unknown</span>;
  };


  const getErrorTypeIcon = (errorType: string | null) => {
    if (!errorType) return null;

    const icons: { [key: string]: any } = {
      TOKEN_EXPIRED: faExclamationTriangle,
      API_ERROR: faTimesCircle,
      ZERO_PRODUCTION: faExclamationTriangle,
      NETWORK_ERROR: faTimesCircle,
      INVALID_RESPONSE: faTimesCircle,
      NO_DATA: faExclamationTriangle,
    };

    return icons[errorType] || faTimesCircle;
  };

  return (
    <div className="fixed inset-0 z-999 flex items-center justify-center bg-black bg-opacity-50 p-2 sm:p-4">
      <div className="relative w-full max-w-6xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden rounded-lg bg-white shadow-xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-3 sm:px-6 py-3 sm:py-4 flex-shrink-0">
          <div className="flex-1 min-w-0 pr-2">
            <h2 className="text-base sm:text-xl font-semibold text-gray-900 truncate">
              Customer Details
            </h2>
            <p className="text-xs sm:text-sm text-gray-600 truncate">{customerName}</p>
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition"
          >
            <FontAwesomeIcon icon={faTimes} className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 px-3 sm:px-6 flex-shrink-0">
          <nav className="-mb-px flex gap-3 sm:gap-6 overflow-x-auto">
            <button
              onClick={() => setActiveTab("billing")}
              className={`py-3 sm:py-4 text-xs sm:text-sm font-medium border-b-2 transition whitespace-nowrap ${
                activeTab === "billing"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Billing History
            </button>
            <button
              onClick={() => setActiveTab("logs")}
              className={`py-3 sm:py-4 text-xs sm:text-sm font-medium border-b-2 transition whitespace-nowrap ${
                activeTab === "logs"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              API Logs (Last 30 Days)
            </button>
          </nav>
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-3 sm:p-6 flex-1">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-gray-500">Loading...</div>
            </div>
          ) : activeTab === "billing" ? (
            /* Billing History Tab */
            <div>
              {billingHistory.length === 0 ? (
                <div className="py-12 text-center text-gray-500">
                  No billing history found for this customer.
                </div>
              ) : (
                <div className="space-y-3 sm:space-y-4">
                  {billingHistory.map((bill) => (
                    <div
                      key={bill.id}
                      className="rounded-lg border border-gray-200 bg-white p-3 sm:p-4 hover:shadow-md transition"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-0">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-xs sm:text-sm font-semibold text-gray-900">
                              {bill.invoice_number}
                            </h3>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 sm:gap-x-8 gap-y-1.5 sm:gap-y-2 text-xs sm:text-sm">
                            <div>
                              <span className="text-gray-500">Period:</span>
                              <span className="ml-2 text-gray-900">
                                {new Date(bill.billing_period_start).toLocaleDateString()} -{" "}
                                {new Date(bill.billing_period_end).toLocaleDateString()}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-500">Revenue:</span>
                              <span className="ml-2 font-medium text-gray-900">
                                ${bill.total_revenue.toFixed(2)}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-500">Total Bill:</span>
                              <span className="ml-2 font-medium text-gray-900">
                                ${bill.total_bill.toFixed(2)}
                              </span>
                            </div>
                            {bill.interest > 0 && (
                              <div>
                                <span className="text-gray-500">Interest:</span>
                                <span className="ml-2 text-gray-900">
                                  ${bill.interest.toFixed(2)}
                                </span>
                              </div>
                            )}
                            {bill.last_overdue > 0 && (
                              <div>
                                <span className="text-gray-500">Previous Overdue:</span>
                                <span className="ml-2 text-gray-900">
                                  ${bill.last_overdue.toFixed(2)}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="text-left sm:text-right text-xs text-gray-500">
                          Created: {new Date(bill.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* Logs Tab */
            <div>
              {logs.length === 0 ? (
                <div className="py-12 text-center text-gray-500">
                  No logs found for this customer.
                </div>
              ) : (
                <div className="space-y-2 sm:space-y-3">
                  {logs.map((log) => (
                    <div
                      key={log.id}
                      className="rounded-lg border border-gray-200 bg-white hover:shadow-md transition"
                    >
                      {/* Log Header */}
                      <div
                        className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 cursor-pointer gap-2"
                        onClick={() =>
                          setExpandedLog(expandedLog === log.id ? null : log.id)
                        }
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            {getStatusBadge(log.status)}
                            <span className="text-xs sm:text-sm font-medium text-gray-900">
                              {new Date(log.log_date).toLocaleDateString("en-US", {
                                weekday: "short",
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              })}
                            </span>
                          </div>

                          {log.status === "failure" && log.error_type && (
                            <div className="flex items-center gap-2">
                              <FontAwesomeIcon
                                icon={getErrorTypeIcon(log.error_type) || faTimesCircle}
                                className="h-3 w-3 sm:h-4 sm:w-4 text-red-500"
                              />
                              <span className="text-xs text-red-600 font-medium">
                                {log.error_type.replace(/_/g, " ")}
                              </span>
                            </div>
                          )}

                          {log.status === "success" && log.production_kwh !== null && (
                            <div className="text-xs text-gray-600">
                              Production: {log.production_kwh.toFixed(2)} kWh
                            </div>
                          )}
                        </div>

                        <button className="text-xs sm:text-sm text-blue-600 hover:text-blue-700 self-start sm:self-auto">
                          {expandedLog === log.id ? "Hide Details" : "View Details"}
                        </button>
                      </div>

                      {/* Expanded Log Details */}
                      {expandedLog === log.id && (
                        <div className="border-t border-gray-200 bg-gray-50 p-3 sm:p-4">
                          <div className="space-y-4">
                            {/* Energy Data */}
                            {log.status === "success" && (
                              <div>
                                <h4 className="text-sm font-semibold text-gray-900 mb-2">
                                  Energy Data
                                </h4>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">Production:</span>
                                    <span className="font-medium">
                                      {log.production_kwh?.toFixed(2) || "N/A"} kWh
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">Consumption:</span>
                                    <span className="font-medium">
                                      {log.consumption_kwh?.toFixed(2) || "N/A"} kWh
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">Feed-In:</span>
                                    <span className="font-medium">
                                      {log.feed_in_kwh?.toFixed(2) || "N/A"} kWh
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">Self-Consumption:</span>
                                    <span className="font-medium">
                                      {log.self_consumption_kwh?.toFixed(2) || "N/A"} kWh
                                    </span>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Error Details */}
                            {log.status === "failure" && (
                              <div>
                                <h4 className="text-sm font-semibold text-gray-900 mb-2">
                                  Error Details
                                </h4>
                                <div className="space-y-2 text-sm">
                                  {log.error_type && (
                                    <div>
                                      <span className="text-gray-600">Type:</span>
                                      <span className="ml-2 font-medium text-red-600">
                                        {log.error_type.replace(/_/g, " ")}
                                      </span>
                                    </div>
                                  )}
                                  {log.error_message && (
                                    <div>
                                      <span className="text-gray-600">Message:</span>
                                      <p className="mt-1 text-red-600 bg-red-50 p-2 rounded">
                                        {log.error_message}
                                      </p>
                                    </div>
                                  )}
                                  {log.http_status_code && (
                                    <div>
                                      <span className="text-gray-600">HTTP Status:</span>
                                      <span className="ml-2 font-medium">
                                        {log.http_status_code}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Raw API Response */}
                            {log.api_response && (
                              <div>
                                <h4 className="text-sm font-semibold text-gray-900 mb-2">
                                  Raw API Response (Debug)
                                </h4>
                                <pre className="mt-2 overflow-auto rounded-lg bg-gray-900 p-4 text-xs text-green-400 max-h-96">
                                  {JSON.stringify(log.api_response, null, 2)}
                                </pre>
                              </div>
                            )}

                            {/* Timestamp */}
                            <div className="text-xs text-gray-500 pt-2 border-t">
                              Logged at: {new Date(log.created_at).toLocaleString()}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-3 sm:px-6 py-3 sm:py-4 bg-gray-50 flex-shrink-0">
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="rounded-lg bg-gray-200 px-4 py-2 text-xs sm:text-sm font-medium text-gray-700 hover:bg-gray-300 transition"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerDetailsModal;
