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
  message: string;
  tier1: number;
  tier2: number;
  tier3: number;
}
interface MonthlyBills {
 total_revenue: number;
 arrears: number;
 invoice_number: string;
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
  const [bills, setbills] = useState<MonthlyBills[]>([]);

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
// fetch monthly bills
const fetchbills = useCallback(async () => {
  try {
    const { data, error: fetchError } = await supabase
      .from("monthly_bills")
      .select("*");
    if (fetchError) throw fetchError;
    setbills(data || []);
  } catch (err) {
    setError(
      err instanceof Error ? err.message : "Error fetching Monthly bills",
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
    fetchbills();
  }, [fetchParameters, fetchCustomerData, fetchbills]);

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
      toast.dismiss(); // Show initial toast before posting

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

      const invoiceNumber = await generateInvoiceNumber();

      // ✅ Check if a bill already exists with the same site_name, email, and billing period
      const { data: existingBills, error: fetchError } = await supabase
        .from("monthly_bills")
        .select("id, arrears") // ✅ Do NOT fetch 'message'
        .eq("site_name", billData.site_name)
        .eq("email", billData.email)
        .eq("billing_period_start", billData.billing_period_start)
        .eq("billing_period_end", billData.billing_period_end);

      if (fetchError) {
        throw fetchError;
      }

      if (existingBills && existingBills.length > 0) {
        toast.error("A bill for this date already exists.");
        return false; // Exit early if the bill already exists
      }

      const previousArrears = existingBills?.[0]?.arrears || 0;
      const total_bill = Number(billData.total_revenue) + previousArrears;

      // ✅ Remove 'message' from billData before inserting into Supabase
      const { message, ...filteredBillData } = billData; // ✅ Exclude message

      // ✅ Insert new bill into `monthly_bills`
      const { error: insertError } = await supabase
        .from("monthly_bills")
        .insert([
          {
            ...filteredBillData, // ✅ Insert without 'message'
            invoice_number: invoiceNumber,
            total_bill: total_bill,
            pending_bill: total_bill,
            arrears: previousArrears,
            reconciliation_ids: [],
            status: "Pending",
          },
        ]);

      if (insertError) {
        throw insertError;
      }

      // ✅ Success
      toast.success("Bill posted successfully!");
      return true;
    } catch (error) {
      console.error("Error handling bill:", error);
      toast.error("Failed to post the bill. Please try again.");
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

  const handleEmailBill = async (billData: any) => {
    setStatus("Processing...");

    try {
      toast.info("Posting bill...");

      // ✅ First, post the bill and retrieve the updated data
      const updatedBillData = await handlePostBill(billData);

      if (!updatedBillData) {
        toast.error("Failed to post bill. Email not sent.");
        return;
      }

      toast.info("Generating invoice PDF...");

      // ✅ Fetch the message separately from `parameters`
      const message =
        parameters.length > 0 && parameters[0]?.message
          ? parameters[0].message
          : "Thank you for doing business with us!";

      // ✅ Generate Invoice HTML Template
      const invoiceHTML = `
    <div style="max-width: 800px; margin: auto; font-family: Arial, sans-serif; border: 1px solid #ddd; padding: 20px; background-color: #fff;">
      <header style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 16px;">
        <img src="/images/logo/logo.svg" alt="Logo" style="max-width: 180px; height: auto;">
      </header>
  
      <section style="border-bottom: 2px solid #ddd; padding-bottom: 16px;">
        <h2 style="color: black; font-size: 16px;">RECIPIENT</h2>
        <p style="color: black; font-size: 20px; font-weight: bold;">INVOICE</p>
        <p><strong>Name:</strong> ${billData.site_name}</p>
        <p><strong>Email:</strong> ${billData.email}</p>
        <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
        <p><strong>Invoice Number:</strong> ${billData.invoice_number}</p>
      </section>
  
      <table style="width: 100%; margin-top: 16px; border-collapse: collapse;">
        <thead>
          <tr style="border-bottom: 2px solid #4CAF50;">
            <th style="padding: 8px; text-align: left;">Period Start</th>
            <th style="padding: 8px; text-align: left;">Period End</th>
            <th style="padding: 8px; text-align: left;">Description</th>
            <th style="padding: 8px; text-align: left;">Energy PTS</th>
            <th style="padding: 8px; text-align: left;">Per Unit</th>
            <th style="padding: 8px; text-align: left;">Total</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="padding: 8px;">${billData.billing_period_start}</td>
            <td style="padding: 8px;">${billData.billing_period_end}</td>
            <td style="padding: 8px;">Energy Produced</td>
            <td style="padding: 8px;">${billData.total_PTS}</td>
            <td style="padding: 8px;">$${billData.energy_rate}</td>
            <td style="padding: 8px;">$${billData.total_revenue}</td>
          </tr>
        </tbody>
      </table>
  
      <section style="margin-top: 20px; text-align: right;">
        <p><strong>Total Period Balance:</strong> $${billData.total_revenue}</p>
        <p style="font-weight: bold; color: black;">Overdue Balance: $${billData.overdueBalance}</p>
        <p style="font-weight: bold; color: red;">Balance Due: $${billData.balanceDue}</p>
      </section>
  
      <section style="margin-top: 20px; font-size: 14px;">
        <h3 style="border-bottom: 2px solid #4CAF50; padding-bottom: 8px;">DIRECT DEPOSIT</h3>
        <p><strong>Bank Name:</strong> Bank of Butterfield</p>
        <p><strong>Account Number:</strong> 060400 6770 014</p>
      </section>
  
      <footer style="margin-top: 20px; text-align: center; font-size: 12px;">
        <div style="margin-bottom: 10px;">
          <p style="text-align: center; font-size: 14px;">${message}</p>
        </div>
        <p>Greenlight Financing Ltd. #48 Par-la-ville Road, Suite 1543, Hamilton, HM11</p>
        <p>
          <a href="mailto:billing@greenlightenergy.bm" style="color: blue; text-decoration: underline;">
            billing@greenlightenergy.bm | Phone: 1 (441) 705 3033
          </a>
        </p>
      </footer>
    </div>
  `;

      const invoiceContainer = document.createElement("div");
      invoiceContainer.innerHTML = invoiceHTML;
      document.body.appendChild(invoiceContainer);

      // ✅ Convert HTML to PDF
      const pdfBlob = await html2pdf().from(invoiceContainer).outputPdf("blob");
      document.body.removeChild(invoiceContainer);

      // ✅ Convert Blob to Base64
      const reader = new FileReader();
      reader.readAsDataURL(pdfBlob);

      reader.onloadend = async () => {
        // ✅ Null check before using `reader.result`
        if (!reader.result) {
          toast.error("Failed to generate PDF. Please try again.");
          return;
        }

        const pdfBase64 = reader.result.toString().split(",")[1]; // Extract base64 data

        // ✅ Send email with PDF as an attachment
        const response = await fetch("/api/sendmail", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userEmail: billData.email, // Ensure the email is passed correctly
            subject: "Invoice from Greenlight Energy",
            htmlContent: `Please find attached your invoice.`,
            attachment: pdfBase64, // Sending Base64 encoded PDF
          }),
        });

        const result = await response.json();
        if (response.ok) {
          toast.success(
            `Invoice email sent successfully to ${billData.email}! ✅`,
          );
        } else {
          toast.error(`Error sending email: ${result.error}`);
        }
      };
    } catch (error) {
      console.error("[ERROR] Failed to process bill or send email:", error);
      toast.error("An error occurred. Please try again.");
    }
  };

  const handlePostAndEmailAllBills = async () => {
    const parameter = parameters[0]; // Using the first parameter from the parameters list

    // Process bills for selected customers
    const billsToProcess = selectedCustomers
      .map((customerId) => {
        const customer = customerData.find((c) => c.id === customerId); // Fetching customer data
        if (!customer) return null; // If no customer found, skip it

        const customerEnergySums = energySums?.[customerId] || {}; // Fetch energy sums for the customer
        const consumptionValue =
          typeof customerEnergySums?.Consumption === "number"
            ? customerEnergySums.Consumption
            : 500;
        const exportValue =
          typeof customerEnergySums?.FeedIn === "number"
            ? customerEnergySums.FeedIn
            : 50;

        // Calculate the bill for this customer
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

        // Validate that necessary fields are present before proceeding
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
          site_name: customer.site_name || "N/A",
          email: customer.email || "N/A",
          address: customer.address || "N/A",
          billing_period_start: startDate,
          billing_period_end: endDate,
          total_cost: billResult.belcoTotal.toFixed(2),
          energy_rate: billResult.belcoPerKwh.toFixed(2),
          total_PTS: consumptionValue || 666999,
          status: "Pending",
        };
      })
      .filter(Boolean); // Filter out any null values (invalid bills)

    console.log("Bills to process:", billsToProcess);

    let successCount = 0;
    let failureCount = 0;

    // Loop over each bill and process it
    for (const billData of billsToProcess) {
      console.log("Processing bill:", billData);

      // Check if the bill already exists for the same customer and date range
      const { data: existingBills, error: fetchError } = await supabase
        .from("monthly_bills")
        .select("id")
        .eq("site_name", billData?.site_name)
        .eq("billing_period_start", billData?.billing_period_start)
        .eq("billing_period_end", billData?.billing_period_end);

      if (fetchError) {
        toast.error("Error fetching existing bills. Please try again.");
        console.error(fetchError);
        failureCount++;
        continue; // Skip this bill
      }

      if (existingBills && existingBills.length > 0) {
        // Skip posting the bill if it already exists for the same customer and period
        failureCount++;
        continue;
      }

      // Now directly send the email (without calling handlePostBill)
      try {
        // Call handleEmailBill to send the email with PDF for this bill
        await handleEmailBill(billData);
        successCount++;
      } catch (emailError) {
        console.error("Failed to send email for bill:", emailError);
        failureCount++;
      }
    }

    // Log the final success and failure counts
    console.log("Final success count:", successCount);
    console.log("Final failure count:", failureCount);

    // Display toast messages based on success/failure
    if (failureCount === 0) {
      toast.success(`Successfully emailed all ${successCount} bills!`);
    } else {
      toast.error(
        `Successfully emailed ${successCount} bills. Failed to email ${failureCount} bills. Check console for details.`,
      );
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
                const bill = bills[0];


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
                  message: parameter.message,
                  total_revenue: billResult.finalRevenue.toFixed(2),
                  invoice_number:bill.invoice_number,
                  arrears: bill.arrears,
                  // this tot_revenue is for balance due wala total_revenue
                  // total_revenue:bill.total_revenue,  

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
                          onClick={() => handleEmailBill(billData)}
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
                  onClick={() => handlePostAndEmailAllBills()}
                  className="rounded bg-green-200 px-4 py-2 text-gray-800 hover:bg-green-300"
                >
                  Post and Email All
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
