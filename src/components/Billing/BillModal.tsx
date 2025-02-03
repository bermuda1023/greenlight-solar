"use client";
import html2pdf from "html2pdf.js";

import React, { useCallback, useEffect, useState } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { calculateBilling } from "@/utils/bill-calculate/billingutils";
import { supabase } from "@/utils/supabase/browserClient";
import { format } from "date-fns";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

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
  belcodisc: number;
  ra_fee: number;
  export_rate: number;
  tier1: number;
  tier2: number;
  tier3: number;
}

interface CustomerData {
  id: string;
  site_ID: number;
  solar_api_key: string;
  site_name?: string; // Ensure this is defined
  email?: string; // Ensure this is defined
  address?: string; // Ensure this is defined
  scaling_factor?: number;
  price?: number;
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
  const [status, setStatus] = useState("");

  const [selectedBills, setSelectedBills] =
    useState<string[]>(selectedCustomers);

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
        .select("*")
        .in("id", selectedCustomers);

      if (fetchError) throw fetchError;
      setCustomerData(data || []);

      console.log("Customer Data:", data);
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
          // scaling:customer.scaling_factor,
          // price:customer.price,
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
        const customer = customerData.find((c) => c.id === customerId);
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
          belcodisc: parameter?.belcodisc || 0.8,
          ra_fee: parameter?.ra_fee || 0.00635,
          export_rate: parameter?.export_rate || 0.2265,
          tier1: parameter?.tier1 || 0.13333,
          tier2: parameter?.tier2 || 0.2259,
          tier3: parameter?.tier3 || 0.3337,
          scaling: customer?.scaling_factor || 1,
          price: customer?.price || 0.31,
        });

        summary.totalRevenue += billResult.finalRevenue;
        summary.totalPts += consumptionValue || 0;
        return summary;
      },
      { totalCost: 0, totalRevenue: 0, totalPts: 0 },
    );
  };
  const summary = calculateSummary();

  const handleRemoveBill = (customerId: string) => {
    try {
      // Check if the customerId exists in the selectedBills array
      if (!selectedBills.includes(customerId)) {
        toast.error("Customer ID not found in the selected bills."); // Error toast if not found
        return;
      }

      // Remove the customerId from selectedBills
      setSelectedBills((prev) => prev.filter((id) => id !== customerId));

      // Show success toast after removal
      toast.success("Customer bill removed successfully!");
    } catch (error) {
      toast.error(
        "An error occurred while removing the bill. Please try again.",
      ); // Error toast for unexpected issues
      console.error("Error removing bill:", error);
    }
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
      toast.dismiss(); // Dismiss previous toasts before showing new ones

      // Basic validation for empty fields
      if (
        !billData.site_name ||
        !billData.email ||
        !billData.billing_period_start ||
        !billData.billing_period_end ||
        !billData.total_revenue ||
        !billData.total_cost ||
        !billData.energy_rate
      ) {
        toast.error("All fields are required. Please fill out all fields.");
        return false; // Exit early if validation fails
      }

      const invoiceNumber = await generateInvoiceNumber();

      // Check if a bill already exists with the same site_name, email, and billing period
      const { data: existingBills, error: fetchError } = await supabase
        .from("monthly_bills")
        .select("id, arrears")
        .eq("site_name", billData.site_name)
        .eq("email", billData.email)
        .eq("billing_period_start", billData.billing_period_start)
        .eq("billing_period_end", billData.billing_period_end);

      if (fetchError) {
        throw fetchError;
      }

      // If an existing bill is found for the same date, show an error
      if (existingBills && existingBills.length > 0) {
        toast.error("A bill for this date already exists.");
        return false; // Exit early if the bill already exists
      }

      const previousArrears = existingBills?.[0]?.arrears || 0;
      const total_bill = Number(billData.total_revenue) + previousArrears;

      let result;
      // Insert new bill if no existing bill is found
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

      if (result.error) throw result.error;

      // If everything is successful
      toast.success("Bill posted successfully!");
      return true;
    } catch (error) {
      // Handle errors
      console.error("Error handling bill:", error);
      toast.error("Failed to post the bill. Check the console for details.");
      return false;
    }
  };

  const handlePostAllBills = async () => {
    const parameter = parameters[0];

    const billsToProcess = selectedCustomers
      .map((customerId) => {
        const customer = customerData.find((c) => c.id === customerId); // Fetching from customerData
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
          belcodisc: parameter?.belcodisc || 0.8,
          ra_fee: parameter?.ra_fee || 0.00635,
          export_rate: parameter?.export_rate || 0.2265,
          tier1: parameter?.tier1 || 0.13333,
          tier2: parameter?.tier2 || 0.2259,
          tier3: parameter?.tier3 || 0.3337,
          scaling: customer?.scaling_factor || 1, // Correctly fetched
          price: customer?.price || 0.31, // Correctly fetched
        });

        // Validation for empty fields
        if (
          !customer?.site_name ||
          !customer?.email ||
          !startDate ||
          !endDate ||
          !billResult.finalRevenue ||
          !billResult.belcoTotal ||
          !billResult.belcoPerKwh
        ) {
          toast.error(
            `Missing required data for customer ${customer?.site_name}`,
          );
          return null; // Skip this bill if any required data is missing
        }

        return {
          customer_id: customer.id,
          site_name: customer.site_name || "N/A", // Kept original reference
          email: customer.email || "N/A", // Kept original reference
          address: customer.address || "N/A", // Kept original reference
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

      // Check if a bill already exists for the same customer and date range (start and end date)
      const { data: existingBills, error: fetchError } = await supabase
        .from("monthly_bills")
        .select("id")
        .eq("site_name", billData?.site_name) // Check by customer name (site_name)
        .eq("billing_period_start", billData?.billing_period_start) // Check by start date
        .eq("billing_period_end", billData?.billing_period_end); // Check by end date

      if (fetchError) {
        toast.error("Error fetching existing bills. Please try again.");
        console.error(fetchError);
        failureCount++;
        continue; // Skip this bill
      }

      if (existingBills && existingBills.length > 0) {
        // If a bill already exists for the same customer and date range
        failureCount++;
        continue; // Skip posting this bill
      }

      // Proceed with posting the bill if no existing bill is found
      const success = await handlePostBill(billData);
      if (success) {
        successCount++;
      } else {
        failureCount++;
      }
    }

    console.log("Final success count:", successCount);
    console.log("Final failure count:", failureCount);

    if (failureCount === 0) {
      toast.success(`Successfully posted all ${successCount} bills!`);
    } else {
      toast.error(
        `Posted ${successCount} bills successfully. Failed to post ${failureCount} bills. Check console for details.`,
      );
    }
  };
  // const handleEmailBill = async (userEmail?: string) => {
  //   setStatus('Sending...');

  //   try {
  //     const response = await fetch('/api/sendmail', {
  //       method: 'POST',
  //       headers: {
  //         'Content-Type': 'application/json',
  //       },
  //       body: JSON.stringify({ userEmail }),
  //     });

  //     const result = await response.json();
  //     if (response.ok) {
  //       setStatus(`Email sent successfully to ${userEmail}! ✅`);
  //     } else {
  //       setStatus(`Error: ${result.error}`);
  //     }
  //   } catch (error) {
  //     console.error('[ERROR] Failed to send email:', error);
  //     setStatus('Failed to send email. Please try again.');
  //   }
  // };

  // const handleEmailBill = async (userEmail?: string) => {
  //   console.log("[LOG] handleEmailBill called with:", userEmail); // Log the email received

  //   if (!userEmail) {
  //     console.error("[ERROR] No email provided!");
  //     setStatus('Error: No email provided.');
  //     return;
  //   }

  //   setStatus(`Sending email to ${userEmail}...`);

  //   try {
  //     console.log("[INFO] Sending request to /api/sendmail...");

  //     const emailData = {
  //       userEmail: userEmail, // The email to send
  //       subject: "Your Invoice", // Example subject (can be dynamic)
  //       message: "Here is your invoice for this month.", // Example message (can be dynamic)
  //     };

  //     console.log("[INFO] Sending the following data:", emailData);

  //     const response = await fetch('/api/sendmail', {
  //       method: 'POST',
  //       headers: {
  //         'Content-Type': 'application/json',
  //       },
  //       body: JSON.stringify(emailData), // ✅ Send email as JSON in body
  //     });

  //     const result = await response.json();
  //     console.log("[INFO] Response received:", result); // Log response from API

  //     if (response.ok) {
  //       setStatus(`Email sent successfully to ${userEmail}! ✅`);
  //     } else {
  //       console.error("[ERROR] Failed to send email:", result.error);
  //       setStatus(`Error: ${result.error}`);
  //     }
  //   } catch (error) {
  //     console.error("[ERROR] Failed to send email:", error);
  //     setStatus('Failed to send email. Please try again.');
  //   }
  // };

  const handleEmailBill = async (billData: any, invoiceRef: any) => {
    try {
      toast.dismiss(); // Dismiss previous toasts before showing new ones

      console.log("[LOG] handleEmailBill called with:", billData.email);

      // ✅ Basic validation for empty fields
      if (
        !billData.site_name ||
        !billData.email ||
        !billData.billing_period_start ||
        !billData.billing_period_end ||
        !billData.total_revenue ||
        !billData.total_cost ||
        !billData.energy_rate
      ) {
        toast.error("All fields are required. Please fill out all fields.");
        return false; // Exit early if validation fails
      }

      setStatus(`Posting bill for ${billData.email}...`);

      const invoiceNumber = await generateInvoiceNumber(); // Ensure this function exists

      // ✅ Check if a bill already exists for the same site, email, and billing period
      const { data: existingBills, error: fetchError } = await supabase
        .from("monthly_bills")
        .select("id, arrears")
        .eq("site_name", billData.site_name)
        .eq("email", billData.email)
        .eq("billing_period_start", billData.billing_period_start)
        .eq("billing_period_end", billData.billing_period_end);

      if (fetchError) {
        throw fetchError;
      }

      // ✅ If an existing bill is found for the same date, show an error
      if (existingBills && existingBills.length > 0) {
        toast.error("A bill for this date already exists.");
        return false; // Exit early if the bill already exists
      }

      const previousArrears = existingBills?.[0]?.arrears || 0;
      const total_bill = Number(billData.total_revenue) + previousArrears;

      // ✅ Insert new bill if no existing bill is found
      const result = await supabase.from("monthly_bills").insert([
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

      if (result.error) throw result.error;

      // ✅ Bill successfully posted
      toast.success("Bill posted successfully!");

      // ✅ Now send email with invoice attachment
      setStatus(`Sending invoice email to ${billData.email}...`);

      // Convert invoice HTML to PDF (Same logic as before)
      if (!invoiceRef.current) {
        console.error("[ERROR] Invoice reference not found!");
        toast.error("Error: Invoice not found.");
        return false;
      }

      console.log("[INFO] Generating PDF...");

      const pdfBlob = await html2pdf().from(invoiceRef.current).toBlob();

      // Convert PDF Blob to Base64
      const reader = new FileReader();
      reader.readAsDataURL(pdfBlob);
      reader.onloadend = async () => {
        const base64PDF = reader.result?.toString().split(",")[1];

        console.log("[INFO] Sending request to /api/sendmail...");

        const emailData = {
          userEmail: billData.email, // Send email from bill data
          subject: "Your Invoice",
          message: "Please find attached your invoice for this month.",
          pdfAttachment: base64PDF, // Attach PDF as base64
          filename: `Invoice-${invoiceNumber}.pdf`,
        };

        console.log("[INFO] Sending the following data:", emailData);

        const response = await fetch("/api/sendmail", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(emailData),
        });

        const result = await response.json();
        console.log("[INFO] Response received:", result);

        if (response.ok) {
          toast.success(`Email sent successfully to ${billData.email}! ✅`);
          setStatus(`Email sent successfully to ${billData.email}! ✅`);
        } else {
          console.error("[ERROR] Failed to send email:", result.error);
          toast.error(`Error: ${result.error}`);
        }
      };
    } catch (error) {
      console.error("[ERROR] Failed to post/send email:", error);
      toast.error(
        "Failed to process the request. Check the console for details.",
      );
      return false;
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <div
        className="fixed inset-0 z-999 flex items-center justify-center bg-gray-3/50 backdrop-blur-sm"
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
                    <span className="font-medium text-gray-700">
                      Total PTS:
                    </span>
                    <span className="font-semibold text-gray-900">
                      {summary.totalPts.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Footer (optional for additional details) */}
                <div className="mt-4 text-center text-xs text-gray-600">
                  All amounts are calculated based on the selected billing
                  period.
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
                const customer = customerData.find((c) => c.id === customerId);
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
                  belcodisc: parameter?.belcodisc || 0.8,
                  ra_fee: parameter?.ra_fee || 0.00635,
                  export_rate: parameter?.export_rate || 0.2265,
                  tier1: parameter?.tier1 || 0.13333,
                  tier2: parameter?.tier2 || 0.2259,
                  tier3: parameter?.tier3 || 0.3337,
                  scaling: customer?.scaling_factor || 1.0,
                  price: customer?.price || 0.31,
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
                        <button
                          onClick={() =>
                            handleEmailBill(customer.email, customer.id)
                          }
                          className="rounded bg-green-200 px-4 py-2 text-gray-800 hover:bg-green-300"
                        >
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
