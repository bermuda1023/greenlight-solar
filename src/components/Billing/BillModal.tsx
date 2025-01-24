"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { calculateBilling } from "@/utils/bill-calculate/billingutils";
import { supabase } from "@/utils/supabase/browserClient";
import { format } from "date-fns";

interface BillModalProps {
  selectedCustomers: string[];
  customers: any[];
  startDate: string | null;
  endDate: string | null;
  onClose: () => void;
}

interface Parameters {
  id: string;
  fuelRate: number;
  feedInPrice: number;
  basePrice: number;
}

interface CustomerData {
  id: string;
  site_ID: number;
  solar_api_key: string;
}

const BillModal: React.FC<BillModalProps> = ({
  selectedCustomers,
  customers,
  startDate,
  endDate,
  onClose,
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [parameters, setParameters] = useState<Parameters[]>([]);
  const [customerData, setCustomerData] = useState<CustomerData[]>([]);
  const [selectedBills, setSelectedBills] = useState<string[]>(selectedCustomers);

  const [energySums, setEnergySums] = useState<{
    [customerId: string]: {
      Consumption?: number;
      FeedIn?: number;
      Production?: number;
    };
  } | null>(null);

  const fetchParameters = useCallback(async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from("parameters")
        .select("*");
      if (fetchError) throw fetchError;
      setParameters(data || []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error fetching parameters",
      );
    }
  }, []);

  const fetchCustomerData = useCallback(async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from("customers")
        .select("id, site_ID, solar_api_key")
        .in("id", selectedCustomers);

      if (fetchError) throw fetchError;
      setCustomerData(data || []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error fetching customer data",
      );
    }
  }, [selectedCustomers]);

  const fetchEnergyData = useCallback(async () => {
    if (!startDate || !endDate) {
      setError("Start and End dates are required");
      return;
    }
    const formattedStartDate = format(
      new Date(startDate),
      "yyyy-MM-dd HH:mm:ss",
    );
    const formattedEndDate = format(new Date(endDate), "yyyy-MM-dd HH:mm:ss");

    try {
      // Fetch energy data for each customer individually
      const energyDataPromises = customerData.map(async (customer) => {
        const proxyUrl = `/api/proxy-energy-data?startTime=${encodeURIComponent(
          formattedStartDate,
        )}&endTime=${encodeURIComponent(
          formattedEndDate,
        )}&siteid=${customer.site_ID}&api_key=${customer.solar_api_key}`;

        const response = await fetch(proxyUrl);
        if (!response.ok)
          throw new Error(`HTTP error! Status: ${response.status}`);

        const data = await response.json();

        // Calculate energy sums for this specific customer
        const customerEnergySums: { [key: string]: number } = {};
        data?.energyDetails?.meters?.forEach((meter: any) => {
          customerEnergySums[meter.type] =
            meter.values.reduce(
              (sum: number, value: any) => sum + (value?.value || 0),
              0,
            ) / 1000; // Convert to kWh
        });

        return {
          customerId: customer.id,
          energySums: customerEnergySums,
        };
      });

      // Wait for all energy data to be fetched
      const energyDataResults = await Promise.all(energyDataPromises);

      // Create an object to store individual customer energy sums
      const individualCustomerEnergySums: {
        [key: string]: { [key: string]: number };
      } = {};
      energyDataResults.forEach((result) => {
        individualCustomerEnergySums[result.customerId] = result.energySums;
      });

      // Set the energy sums for individual customers
      setEnergySums(individualCustomerEnergySums);
      setLoading(false);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error fetching energy data",
      );
      setLoading(false);
    }
  }, [startDate, endDate, customerData]);

  useEffect(() => {
    fetchParameters();
    fetchCustomerData();
  }, [fetchParameters, fetchCustomerData]);

  useEffect(() => {
    if (customerData.length > 0) {
      fetchEnergyData();
    }
  }, [customerData, fetchEnergyData]);

  const calculateSummary = () => {
    return selectedBills.reduce(
      (summary, customerId) => {
        const customer = customers.find((c) => c.id === customerId);
        if (!customer) return summary;
        const parameter = parameters[0];

      
        const customerEnergySums = energySums?.[customerId] || {};
        const consumptionValue =
          typeof customerEnergySums?.Consumption === "number"
            ? customerEnergySums.Consumption
            : 500;
        const exportValue =
          typeof customerEnergySums?.FeedIn === "number"
            ? customerEnergySums.FeedIn
            : 50;
      
  
 
        const billResult = calculateBilling({
          energyConsumed: consumptionValue,
          startDate: new Date(startDate || ""),
          endDate: new Date(endDate || ""),
          fuelRate: parameter?.fuelRate || 0.14304,
          energyExported: exportValue,
          basePrice: parameter?.basePrice || 0.15,
          feedInPrice: parameter?.feedInPrice || 0.5,
        });

        summary.totalRevenue += (billResult.finalRevenue);
        summary.totalPts += (consumptionValue || 0);
        return summary;
      },
      { totalCost: 0, totalRevenue: 0, totalPts: 0 },
    );
  };
  const summary = calculateSummary();

  const handleRemoveBill = (customerId: string) => {
    setSelectedBills((prev) => prev.filter((id) => id !== customerId));
  };

  const generateInvoiceNumber = async (): Promise<string> => {
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const { count, error } = await supabase
      .from("monthly_bills")
      .select("*", { count: "exact" })
      .like("invoice_number", `INV-${today}-%`);

    if (error) throw new Error("Error fetching invoice count");

    const sequentialNumber = (count || 0) + 1;
    return `INV-${today}-${sequentialNumber.toString().padStart(3, "0")}`;
  };

  const handlePostBill = async (billData: any) => {
    try {
      const invoiceNumber = await generateInvoiceNumber();
      const { data: existingBills, error: fetchError } = await supabase
        .from("monthly_bills")
        .select("id,arrears")
        .eq("site_name", billData.site_name)
        .eq("email", billData.email)
        .eq("billing_period_start", billData.billing_period_start)
        .eq("billing_period_end", billData.billing_period_end);
  
      if (fetchError) {
        throw fetchError;
      }
  
      const previousArrears = existingBills?.[0]?.arrears || 0;
      const total_bill = Number(billData.total_revenue) + previousArrears;
  
      let result;
      // If we found an existing bill, update it
      if (existingBills && existingBills.length > 0) {
        result = await supabase
          .from("monthly_bills")
          .update({
            status: billData.status,
            total_cost: billData.total_cost,
            energy_rate: billData.energy_rate,
            total_revenue: billData.total_revenue,
            total_PTS: billData.total_PTS || 666999,
            total_bill: total_bill,
            pending_bill: total_bill,
            arrears: previousArrears,
            reconciliation_ids: [],
          })
          .eq("id", existingBills[0].id);
      } else {
        // Insert new bill if none exists
        result = await supabase.from("monthly_bills").insert([
          {
            ...billData,
            invoice_number: invoiceNumber,
            total_bill: total_bill,
            pending_bill: total_bill,
            arrears: previousArrears,
            reconciliation_ids: [],
            status: "Pending",
          },
        ]);
      }
  
      if (result.error) throw result.error;
  
      // If everything is successful
      alert("Bill posted successfully!");
      return true;
    } catch (error) {
      // Handle errors
      console.error("Error handling bill:", error);
      alert("Failed to post the bill. Check the console for details.");
      return false;
    }
  };
  

  const handlePostAllBills = async () => {
    const parameter = parameters[0];

    const billsToProcess = selectedCustomers
      .map((customerId) => {
        const customer = customers.find((c) => c.id === customerId);
        if (!customer) return null;

        const customerEnergySums = energySums?.[customerId] || {};
        const consumptionValue =
          typeof customerEnergySums?.Consumption === "number"
            ? customerEnergySums.Consumption
            : 500;
        const exportValue =
          typeof customerEnergySums?.FeedIn === "number"
            ? customerEnergySums.FeedIn
            : 50;

        const billResult = calculateBilling({
          energyConsumed: consumptionValue,
          startDate: new Date(startDate || ""),
          endDate: new Date(endDate || ""),
          fuelRate: parameter?.fuelRate || 0.14304,
          energyExported: exportValue,
          basePrice: parameter?.basePrice || 0.15,
          feedInPrice: parameter?.feedInPrice || 0.5,
        });

        return {
          customer_id: customer.id,
          site_name: customer?.site_name || "N/A",
          email: customer?.email || "N/A",
          address: customer?.address || "N/A",
          billing_period_start: startDate,
          billing_period_end: endDate,
          total_cost: billResult.belcoTotal.toFixed(2),
          energy_rate: billResult.belcoPerKwh.toFixed(2),
          total_revenue: billResult.finalRevenue.toFixed(2),
          total_PTS: consumptionValue || 666999,
          status: "Pending",
        };
      })
      .filter(Boolean);

    console.log("Bills to process:", billsToProcess);

    let successCount = 0;
    let failureCount = 0;

    for (const billData of billsToProcess) {
      console.log("Processing bill:", billData);
      const success = await handlePostBill(billData);
      console.log("Post result:", success);
      if (success) {
        successCount++;
      } else {
        failureCount++;
      }
    }

    console.log("Final success count:", successCount);
    console.log("Final failure count:", failureCount);

    if (failureCount === 0) {
      alert(`Successfully posted all ${successCount} bills!`);
    } else {
      alert(
        `Posted ${successCount} bills successfully. Failed to post ${failureCount} bills. Check console for details.`,
      );
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <div
        className="fixed inset-0 z-9999 flex items-center justify-center bg-gray-3/50 backdrop-blur-sm"
        onClick={onClose}
      >
        <div
          className="max-h-[80vh] w-2/3 overflow-y-auto rounded-lg bg-white p-8 shadow-xl dark:bg-gray-dark"
          onClick={(e) => e.stopPropagation()}
        >
          <h2 className="mb-6 text-center text-2xl font-bold">
            Billing Summary
          </h2>

          {error ? (
            <p className="text-red-500">{error}</p>
          ) : loading ? (
            <p>Loading...</p>
          ) : (
            <>

          {/* Summary Section */}
          <div className="mb-6 rounded-lg border border-dashed border-gray-300 bg-green-50 p-6">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between border-b border-gray-300 pb-2">
                <span className="font-medium text-gray-700">
                  Total Revenue:
                </span>
                <span className="font-semibold text-gray-900">
                  ${summary.totalRevenue.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between border-b border-gray-300 pb-2">
                <span className="font-medium text-gray-700">Total PTS:</span>
                <span className="font-semibold text-gray-900">
                  {summary.totalPts.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Footer (optional for additional details) */}
            <div className="mt-4 text-center text-xs text-gray-600">
              All amounts are calculated based on the selected billing period.
            </div>
          </div>

              <div className="mb-4">
                <h3 className="text-lg font-bold">Energy Data Summary</h3>
                {energySums ? (
                  <ul>
                    {Object.entries(energySums).map(([type, sum]) => (
                      <li key={type}>
                        {/* <strong>{type}:</strong> {sum} kWh */}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>No energy data available.</p>
                )}
              </div>

              {selectedBills.map((customerId) => {
                const customer = customers.find((c) => c.id === customerId);
                if (!customer) return null;

                const parameter = parameters[0];

                // Use individual customer energy sums
                const customerEnergySums = energySums?.[customerId] || {};
                const consumptionValue = customerEnergySums?.Consumption || 500;
                const exportValue = customerEnergySums?.FeedIn || 50;
                const productionValue = customerEnergySums?.Production || 0;

                const billResult = calculateBilling({
                  energyConsumed: consumptionValue,
                  startDate: new Date(startDate || ""),
                  endDate: new Date(endDate || ""),
                  fuelRate: parameter?.fuelRate || 0.14304,
                  energyExported: exportValue,
                  basePrice: parameter?.basePrice || 0.15,
                  feedInPrice: parameter?.feedInPrice || 0.5,
                });

                const billData = {
                  site_name: customer?.site_name || "N/A",
                  email: customer?.email || "N/A",
                  address: customer?.address || "N/A",
                  billing_period_start: startDate,
                  billing_period_end: endDate,
                  total_cost: billResult.belcoTotal.toFixed(2),
                  energy_rate: billResult.belcoPerKwh.toFixed(2),
                  total_revenue: billResult.finalRevenue.toFixed(2),
                  total_PTS: billResult.totalpts || "69",
                  status: "Pending",
                };

                return (
                  <div
                    key={customerId}
                    className="mb-8 rounded-lg border border-gray-200 bg-gray-50 p-4"
                  >
                    {/* User Details */}
                    <div className="flex justify-between">
                      <div className="mb-4">
                        <h3 className="text-lg font-semibold text-gray-700">
                          {customer?.site_name}
                        </h3>
                        <p className="text-sm text-gray-500">
                          <strong>Email:</strong> {customer?.email || "N/A"}{" "}
                          <br />
                          <strong>Address:</strong> {customer?.address || "N/A"}
                        </p>
                      </div>
                      <div className="mb-4 flex flex-col items-end">
                        <strong className="text-base text-gray-dark">
                          Billing Period:
                        </strong>
                        <span className="text-sm text-gray-6">
                          {startDate} to {endDate}
                        </span>
                      </div>
                    </div>

                    {/* Invoice Summary */}
                    <div className="mb-4 grid grid-cols-2 gap-4 text-sm text-gray-600">
                      <div>
                        <p>
                          <strong>Total Consumed PTS:</strong>
                          {consumptionValue.toFixed(2)}
                        </p>
                        <p>
                          <strong>FeedIn:</strong>
                          {exportValue.toFixed(2)} kWh
                        </p>
                        <p>
                          <strong>Energy Rate:</strong> $
                          {billResult.belcoPerKwh.toFixed(2)}/kWh
                        </p>
                      </div>
                      <div>
                        <p>
                          <strong>Total:</strong> $
                          {billResult.finalRevenue.toFixed(2)}
                        </p>
                        <p>
                          <strong>Description:</strong> sample description
                        </p>
                      </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="flex items-end justify-between">
                      <div className="text-sm text-gray-500">
                        <p>Generated on: {new Date().toLocaleDateString()}</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          className="rounded bg-red-200 px-4 py-2 text-red-800 hover:bg-red-300"
                          onClick={() => handleRemoveBill(customerId)}
                        >
                          Remove
                        </button>
                        <button className="rounded bg-green-200 px-4 py-2 text-gray-800 hover:bg-green-300">
                          Post and Email
                        </button>
                        <button
                          onClick={() => handlePostBill(billData)}
                          className="rounded bg-dark-2 px-4 py-2 font-medium text-white hover:bg-dark"
                        >
                          Post Bill
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}

              <div className="mt-6 flex justify-end gap-4">
                <button
                  onClick={onClose}
                  className="rounded bg-gray-3 px-4 py-2 text-dark-2 hover:bg-gray-4"
                >
                  Close
                </button>
                <button
                  onClick={handlePostAllBills}
                  className="rounded bg-primary px-4 py-2 text-white hover:bg-primary/90"
                >
                  Post All
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </Dialog>
  );
};

export default BillModal;
