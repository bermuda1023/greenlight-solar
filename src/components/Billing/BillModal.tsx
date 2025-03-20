"use client";
import html2pdf from "html2pdf.js";
import { useMemo } from "react";

import React, { useCallback, useEffect, useState } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { calculateBilling } from "@/utils/bill-calculate/billingutils";
import { supabase } from "@/utils/supabase/browserClient";
import { format } from "date-fns";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { CustomerBalanceService } from "@/services/balance-service";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTimes } from "@fortawesome/free-solid-svg-icons";

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
  emailmsg: string;
  tier1: number;
  tier2: number;
  tier3: number;
}

interface CustomerBalanceProp {
  customer_id: string;
  total_billed: number;
  total_paid: number;
  current_balance: number;
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
  const [customerBalance, setCustomerBalance] = useState<CustomerBalanceProp[]>(
    [],
  );

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
      SelfConsumption?: number;
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

  const fetchCustomerBalance = useCallback(async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from("customer_balances")
        .select("*")
        .in("customer_id", selectedCustomers);
      if (fetchError) throw fetchError;
      setCustomerBalance(data || []);
      console.log(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error fetching parameters",
      );
    }
  }, [selectedCustomers]);

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

        console.log(
          `Computed Energy Sums for Customer ${customer.id}:`,
          customerEnergySums,
        );

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
    fetchCustomerBalance();
    fetchCustomerData();
    fetchbills();
  }, [fetchParameters, fetchCustomerData, fetchbills, fetchCustomerBalance]);

  useEffect(() => {
    if (customerData.length > 0) {
      fetchEnergyData();
    }
  }, [customerData, fetchEnergyData]);

  const calculateSummary = () => {
    return selectedCustomers.reduce(
      (summary, customerId) => {
        const customer = customers.find((c) => c.id === customerId);
        if (!customer) return summary;
        const parameter = parameters[0];

        const customerEnergySums = energySums?.[customerId] || {};

        console.log(
          `Energy Sums for Customer 👀👀👀🐱‍🚀👀 ${customerId}:`,
          customerEnergySums,
        );

        const consumptionValue =
          typeof customerEnergySums?.Consumption === "number"
            ? customerEnergySums.Consumption
            : 500;
        const exportValue =
          typeof customerEnergySums?.FeedIn === "number"
            ? customerEnergySums.FeedIn
            : 50;
        const selfConsumptionValue =
          typeof customerEnergySums?.SelfConsumption === "number"
            ? customerEnergySums.SelfConsumption
            : 0;

        const customerBalanceEntry = customerBalance.find(
          (balance) => balance.customer_id === customerId,
        );

        const productionValue =
          typeof customerEnergySums?.Production === "number"
            ? customerEnergySums.Production
            : 0;

        console.log(`Customer Energy Data - ID: ${customerId}`);
        console.log("Consumption:🌹🌹🌹", consumptionValue);
        console.log("FeedIn (Export):", exportValue);
        console.log("Self Consumption 🤦‍♀️🤦‍♀️🤦‍♀️:", selfConsumptionValue);
        console.log("Total Production 🍤🍤🍤🍤:", productionValue);

        const billResult = calculateBilling({
          energyConsumed: consumptionValue,
          energyExported: exportValue,
          selfConsumption: selfConsumptionValue,
          totalProduction: productionValue, // Add this line

          startDate: new Date(startDate || ""),
          endDate: new Date(endDate || ""),
          fuelRate: parameter?.fuelRate,
          basePrice: parameter?.basePrice,
          feedInPrice: parameter?.feedInPrice,
          belcodisc: parameter?.belcodisc,
          ra_fee: parameter?.ra_fee,
          export_rate: parameter?.export_rate,
          tier1: parameter?.tier1,
          tier2: parameter?.tier2,
          tier3: parameter?.tier3,
          scaling: customer?.scaling_factor,
          price: customer?.price,
          fixedFeeSaving: 54.37,
        });
        console.log(
          `Billing Calculation Result for Customer  🍟🍟🍟🍔🍔 ${customerId}:`,
        );
        console.log("Final Revenue:", billResult.finalRevenue);
        console.log("Total PTS:", billResult.totalpts);
        console.log("Belco Total:", billResult.belcoTotal);
        console.log("Belco Per kWh:", billResult.belcoPerKwh);
        console.log("GreenLight Revenue:", billResult.greenlightRevenue);
        console.log("Belco Revenue:", billResult.belcoRevenue);
        console.log("Savings:", billResult.savings);

        const outstandingBalance = customerBalanceEntry?.current_balance || 0;

        summary.totalRevenue += billResult.finalRevenue;
        summary.totalPts += consumptionValue || 0;
        summary.totalOutstanding += outstandingBalance;
        summary.totalBelcoRevenue += billResult.belcoRevenue;
        summary.totalGreenlightRevenue += billResult.greenlightRevenue;
        summary.totalSavings += billResult.savings;

        return summary;
      },
      {
        totalCost: 0,
        totalRevenue: 0,
        totalPts: 0,
        totalOutstanding: 0,
        totalBelcoRevenue: 0,
        totalGreenlightRevenue: 0,
        totalSavings: 0,
      },
    );
  };

  const summary = useMemo(() => {
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
        const selfConsumptionValue =
          typeof customerEnergySums?.SelfConsumption === "number"
            ? customerEnergySums.SelfConsumption
            : 0;

        const customerBalanceEntry = customerBalance.find(
          (balance) => balance.customer_id === customerId,
        );

        const productionValue =
          typeof customerEnergySums?.Production === "number"
            ? customerEnergySums.Production
            : 0;

        console.log(`Customer Energy Data - ID: ${customerId}`);
        console.log("Consumption:🌹🌹🌹", consumptionValue);
        console.log("FeedIn (Export):", exportValue);
        console.log("Self Consumption 🤦‍♀️🤦‍♀️🤦‍♀️:", selfConsumptionValue);
        console.log("Total Production 🍤🍤🍤🍤:", productionValue);

        const billResult = calculateBilling({
          energyConsumed: consumptionValue,
          energyExported: exportValue,
          selfConsumption: selfConsumptionValue,
          totalProduction: productionValue, // Add this line

          startDate: new Date(startDate || ""),
          endDate: new Date(endDate || ""),
          fuelRate: parameter?.fuelRate,
          basePrice: parameter?.basePrice,
          feedInPrice: parameter?.feedInPrice,
          belcodisc: parameter?.belcodisc,
          ra_fee: parameter?.ra_fee,
          export_rate: parameter?.export_rate,
          tier1: parameter?.tier1,
          tier2: parameter?.tier2,
          tier3: parameter?.tier3,
          scaling: customer?.scaling_factor,
          price: customer?.price,
          fixedFeeSaving: 54.37,
        });

        const outstandingBalance = customerBalanceEntry?.current_balance || 0;

        summary.totalRevenue += billResult.finalRevenue;
        summary.totalPts += consumptionValue || 0;
        summary.totalOutstanding += outstandingBalance;
        summary.totalBelcoRevenue += billResult.belcoRevenue;
        summary.totalGreenlightRevenue += billResult.greenlightRevenue;
        summary.totalSavings += billResult.savings;

        return summary;
      },
      {
        totalCost: 0,
        totalRevenue: 0,
        totalPts: 0,
        totalOutstanding: 0,
        totalBelcoRevenue: 0,
        totalGreenlightRevenue: 0,
        totalSavings: 0,
      },
    );
  }, [selectedBills, customers, energySums, parameters, customerBalance]);

  // const summary = calculateSummary();

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
      if (
        !billData.site_name ||
        !billData.email ||
        !billData.billing_period_start ||
        !billData.billing_period_end ||
        !billData?.total_revenue ||
        !billData?.total_cost ||
        !billData?.energy_rate
      ) {
        toast.error("All fields are required.");
        return false;
      }

      const invoiceNumber = await generateInvoiceNumber();

      const { data: existingBills, error: fetchError } = await supabase
        .from("monthly_bills")
        .select("id, arrears")
        .eq("site_name", billData.site_name)
        .eq("email", billData.email)
        .eq("billing_period_start", billData.billing_period_start)
        .eq("billing_period_end", billData.billing_period_end);

      if (fetchError) throw fetchError;

      // if (existingBills?.length > 0) {
      //   toast.error("A bill for this date already exists.");
      //   return false;
      // }

      const previousArrears = existingBills?.[0]?.arrears || 0;
      const total_bill = Number(billData.total_revenue) + previousArrears;

      console.log("Saving Bill Data:", {
        ...billData,
        invoice_number: invoiceNumber,
        total_bill,
        pending_bill: total_bill,
        arrears: previousArrears,
        savings: Number(billData.savings) || 0, // Ensure number value
        belco_revenue: Number(billData.belco_revenue) || 0, // Ensure number value
        greenlight_revenue: Number(billData.greenlight_revenue) || 0, // Ensure number value
      });

      const { data: insertedBills, error: insertError } = await supabase
        .from("monthly_bills")
        .insert([
          {
            ...billData,
            invoice_number: invoiceNumber,
            total_bill: total_bill,
            pending_bill: total_bill,
            arrears: previousArrears,
            reconciliation_ids: [],
            status: "Pending",
            savings: billData.savings,
            belco_revenue: billData.belco_revenue,
            greenlight_revenue: billData.greenlight_revenue,
          },
        ])
        .select("*"); // Ensure the inserted data is retrieved

      if (insertError) throw insertError;

      await new CustomerBalanceService().addNewBill(
        billData.customer_id,
        total_bill,
      );

      //  toast.success("Bill posted successfully!");

      console.log("Inserted Bill:", insertedBills?.[0]);

      return (
        insertedBills?.[0] ?? {
          invoice_number: invoiceNumber,
          arrears: previousArrears,
        }
      );
    } catch (error) {
      console.error("Error handling bill:", error);
      //  toast.error("Failed to post the bill.");
      return false;
    }
  };

  const handlePostAllBills = async () => {
    const parameter = parameters[0];
    toast.info("Processing...");
    const billsToProcess = selectedCustomers
      .map((customerId) => {
        const customer = customers.find((c) => c.id === customerId); // Fetching from customerData
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

        const selfConsumptionValue =
          typeof customerEnergySums?.SelfConsumption === "number"
            ? customerEnergySums.SelfConsumption
            : 0;

        const productionValue =
          typeof customerEnergySums?.Production === "number"
            ? customerEnergySums.Production
            : 0;

        const billResult = calculateBilling({
          energyConsumed: consumptionValue,
          energyExported: exportValue,
          selfConsumption: selfConsumptionValue,
          totalProduction: productionValue, // Add this line

          startDate: new Date(startDate || ""),
          endDate: new Date(endDate || ""),
          fuelRate: parameter?.fuelRate,
          basePrice: parameter?.basePrice,
          feedInPrice: parameter?.feedInPrice,
          belcodisc: parameter?.belcodisc,
          ra_fee: parameter?.ra_fee,
          export_rate: parameter?.export_rate,
          tier1: parameter?.tier1,
          tier2: parameter?.tier2,
          tier3: parameter?.tier3,
          scaling: customer?.scaling_factor,
          price: customer?.price,
          fixedFeeSaving: 54.37,
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
          // toast.error(   `Missing required data for customer ${customer?.site_name}`, );
          return null; // Skip this bill if any required data is missing
        }
        const previousArrears = customer.previousArrears || 0;
        const totalBillAmount =
          Number(billResult.finalRevenue) + previousArrears;

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
          arrears: previousArrears, // Include the arrears from previous bills
          total_bill: totalBillAmount, // Total amount including arrears
          // Include the additional fields
          savings: billResult.savings.toFixed(2),
          belco_revenue: billResult.belcoRevenue.toFixed(2),
          greenlight_revenue: billResult.greenlightRevenue.toFixed(2),
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

      console.log(
        "Sending billData to handlePostBill from handlePostAllBills 🦪🦪🦪🦪🦪:",
        billData,
      );

      // Proceed with posting the bill if no existing bill is found
      const success = await handlePostBill(billData);
      if (success) {
        successCount++;
      } else {
        failureCount++;
      }
    }
    toast.dismiss();
    console.log("Final success count:", successCount);
    console.log("Final failure count:", failureCount);

    if (failureCount === 0) {
      toast.success(`Successfully posted all ${successCount} bills!`);
    } else {
      toast.error(
        `Posted ${successCount} bills successfully. Failed to post ${failureCount} bills.`,
      );
    }
    onClose();
  };

  const handleEmailBill = async (billData: any) => {
    setStatus("Processing...");

    try {
      // toast.info("Posting bill...");

      // ✅ First, post the bill and retrieve the updated data
      const updatedBillData = await handlePostBill(billData);
      console.log("updatedbill", updatedBillData);

      if (!updatedBillData || !updatedBillData.invoice_number) {
        // toast.error("Failed to post bill. Invoice not sent.");
        return;
      }

      const { data: customerBalanceData, error: balanceError } = await supabase
        .from("customer_balances")
        .select("current_balance")
        .eq("customer_id", billData.customer_id)
        .single(); // Expecting only one record

      if (balanceError) {
        console.error("Error fetching customer balance:", balanceError);
        toast.error("Failed to fetch customer balance. Email not sent.");
        return;
      }

      // ✅ Extract `overdueBalance`
      const overdueBalance =
        (customerBalanceData?.current_balance || 0) -
        (billData?.total_revenue || 0);

      // ✅ Compute `balanceDue`
      const balanceDue = parseFloat(billData.total_revenue) + overdueBalance;

      // toast.info("Generating invoice PDF...");

      // ✅ Fetch the message separately from `parameters`
      const message =
        parameters.length > 0 && parameters[0]?.message
          ? parameters[0].message
          : "Thank you for doing business with us!";

      const billingDate = new Date(billData?.billing_period_end);
      const monthYear = billingDate.toLocaleString("en-US", {
        month: "long",
        year: "numeric",
      });
      const Emailmessage =
        parameters.length > 0 && parameters[0]?.emailmsg
          ? `<p style="color: black;">Dear ${billData?.site_name},</p>
             <p style="color: black;">${parameters[0].emailmsg}</p>
             <p style="color: black;"><strong>Invoice Summary:</strong><br>- Total Revenue: $${billData.total_revenue}<br>- Overdue Balance: $${overdueBalance.toFixed(3)}</p>
             <p style="color: black;">Thank you for your continued partnership.</p>
             <p style="color: black;">Best regards,<br>Green Light Energy</p>`
          : `<p style="color: black;">Dear ${billData?.site_name},</p>
             <p style="color: black;">Please find attached the invoice for your account for the month of ${monthYear}. Kindly review the details and ensure payment is made promptly.</p>
             <p style="color: black;"><strong>Invoice Summary:</strong><br>- Total Revenue: $${billData.total_revenue}<br>- Overdue Balance: $${overdueBalance.toFixed(3)}</p>
             <p style="color: black;">Thank you for your continued partnership.</p>
             <p style="color: black;">Best regards,<br>Green Light Energy</p>`;

      console.log(Emailmessage);

      // Display the generated email message

      // ✅ Generate Invoice HTML Template

      const invoiceHTML = `
  <div  
    class="mx-auto h-[297mm] w-full max-w-[210mm] border border-gray-300 bg-white px-8 pb-12">
    
    <!-- Header -->
    <header class="flex items-center justify-between py-16 mt-6">
      <img 
        src="/images/logo/logo.svg" 
        alt="Logo"
        width="360" 
        height="60" 
        class="max-w-full"
      />
    </header>

    <!-- Recipient and Invoice Info -->
    <section class="mb-26 mt-9">
      <div class="flex items-center justify-between pb-2">
        <h2 class="text-md text-black">RECIPIENT</h2>
        <div class="pr-3 text-2xl font-semibold text-black">INVOICE</div>
      </div>

      <table class="mt-4 w-full text-left text-gray-600">
        <tbody>
          <tr>
            <td class="pr-4 text-sm font-semibold text-black">Name:</td>
            <td class="text-xs">${billData.site_name}</td>
            <td class="pr-4 text-sm font-semibold text-black">Email:</td>
            <td class="text-xs">${billData.email}</td>
            <td class="pr-4 text-sm font-semibold text-black">Date:</td>
            <td class="text-xs">${new Date().toLocaleDateString()}</td>
          </tr>
          <tr>
            <td class="pr-4 text-sm font-semibold text-black">Address:</td>
            <td class="text-xs">${billData.address || "N/A"}</td>
            <td class="pr-4 text-sm font-semibold text-black">Invoice Number:</td>
            <td class="text-xs">${updatedBillData.invoice_number}</td>
            <td></td>
            <td></td>
          </tr>
        </tbody>
      </table>
    </section>

    <!-- Billing Details -->
    <table class="mb-20 w-full text-left text-sm">
      <thead class="border-b-2 border-green-300 text-gray-700">
        <tr>
          <th class="p-3 text-sm">Period Start</th>
          <th class="p-3 text-sm">Period End</th>
          <th class="p-3 text-sm">Description</th>
          <th class="p-3 text-sm">Energy PTS</th>
          <th class="p-3 text-sm">Total</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td class="p-3 text-xs text-gray-600">${billData.billing_period_start}</td>
          <td class="p-3 text-xs text-gray-600">${billData.billing_period_end}</td>
          <td class="p-3 text-xs text-gray-600">Energy Produced</td>
          <td class="p-3 text-xs text-gray-600">${billData.total_PTS.toFixed(2)}</td>
          <td class="p-3 text-xs text-gray-600">$ ${billData.total_revenue}</td>
        </tr>
      </tbody>
    </table>

    

    <!-- Balance Due and Overdue Balance -->
    <section class="mb-6 space-y-6 text-right">
      <div class="flex w-full justify-end text-sm font-semibold text-gray-800">
        <p>TOTAL PERIOD BALANCE</p>
        <span class="ml-20 w-20 text-black">$ ${billData.total_revenue}</span>
      </div>
  
      <div class="flex w-full justify-end text-sm font-semibold text-gray-800">
        <p> OVERDUE BALANCE</p>
        <span class="ml-20 w-20 text-black">$ ${overdueBalance.toFixed(2)}</span>
      </div>
  
      <div class="flex w-full justify-end text-sm font-semibold text-red-600">
        <p> BALANCE DUE</p>
        <span class="ml-20 w-20">$ ${balanceDue}</span>
      </div>
    </section>

    <!-- Direct Deposit Information -->
    <section class="mt-12 text-sm text-gray-700">
      <h3 class="mb-4 w-1/2 border-b-2 border-green-300 p-4 font-semibold text-black">
        DIRECT DEPOSIT
      </h3>
      <p class="text-sm">Bank Name: <span class="text-xs font-semibold">Bank of Butterfield</span></p>
      <p class="text-sm">Account Name: <span class="text-xs font-semibold">GreenLight Financing Ltd.</span></p>
      <p class="text-sm">Account Number: <span class="text-xs font-semibold">060400 6770 014</span></p>
    </section>

    <!-- Footer -->
    <footer class="mt-24 grid grid-cols-3 gap-12 text-gray-800">
      <div class="col-span-1">
        <p class="text-center text-sm">
          ${message || "Thank you for doing business with us!"}
        </p>
      </div>
      <div class="col-span-1 text-xs">
        <p>
          Greenlight Financing Ltd. #48 Par-la-ville Road, Suite 1543, Hamilton, HM11
        </p>
      </div>
      <div class="col-span-1 text-xs">
        <a href="mailto:billing@greenlightenergy.bm" class="text-blue-700 underline">
          billing@greenlightenergy.bm <br/> Phone: 1 (441) 705 3033
        </a>
      </div>
    </footer>
  </div>
`;

      const invoiceContainer = document.createElement("div");
      invoiceContainer.innerHTML = invoiceHTML;
      document.body.appendChild(invoiceContainer);

      // ✅ Convert HTML to PDF
      const pdfOptions = {
        margin: [0, 0, -4, 0], // Adjust margins to avoid extra space that could cause a page break
        filename: "invoice.pdf",
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: {
          scale: 2, // Increase scale for better resolution
          letterRendering: true,
          useCORS: true, // Ensure images can be loaded from the same domain
        },
        jsPDF: {
          unit: "mm",
          format: "a4", // Ensure it's A4 size
          orientation: "portrait", // Portrait orientation
          autoPaging: false, // Prevent auto-page generation, ensure one page only
        },
      };

      // Apply these settings during PDF generation
      const pdfBlob = await html2pdf()
        .from(invoiceContainer)
        .set(pdfOptions)
        .outputPdf("blob");

      document.body.removeChild(invoiceContainer);

      // ✅ Convert Blob to Base64
      const reader = new FileReader();
      reader.readAsDataURL(pdfBlob);

      reader.onloadend = async () => {
        // ✅ Null check before using `reader.result`
        if (!reader.result) {
          // toast.error("Failed to generate PDF. Please try again.");
          return;
        }

        const pdfBase64 = reader.result.toString().split(",")[1]; // Extract base64 data

        const billingDate = new Date(billData?.billing_period_end);
        const monthYear = billingDate.toLocaleString("en-US", {
          month: "long",
          year: "numeric",
        });

        const emailsubject = `Greenlight Energy Bill - ${monthYear}`;
        // ✅ Send email with PDF as an attachment
        const response = await fetch("/api/sendmail", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            userEmail: billData.email, // Ensure the email is passed correctly
            subject: emailsubject,
            htmlContent: Emailmessage,
            attachment: pdfBase64, // Sending Base64 encoded PDF
          }),
        });
      };
    } catch (error) {
      console.error("[ERROR] Failed to process bill or send email:", error);
      toast.error("An error occurred. Please try again.");
    }
  };

  const handlePostAndEmailAllBills = async () => {
    const toastID = toast.info("Processing...");
    const parameter = parameters[0]; // Using the first parameter from the parameters list

    // Process bills for selected customers
    const billsToProcess = selectedCustomers
      .map((customerId) => {
        const customer = customers.find((c) => c.id === customerId); // Fetching customer data
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

        const selfConsumptionValue =
          typeof customerEnergySums?.SelfConsumption === "number"
            ? customerEnergySums.SelfConsumption
            : 0;

        const productionValue =
          typeof customerEnergySums?.Production === "number"
            ? customerEnergySums.Production
            : 0;

        // Calculate the bill for this customer
        const billResult = calculateBilling({
          energyConsumed: consumptionValue,
          energyExported: exportValue,
          selfConsumption: selfConsumptionValue,
          totalProduction: productionValue, // Add this line

          startDate: new Date(startDate || ""),
          endDate: new Date(endDate || ""),
          fuelRate: parameter?.fuelRate,
          basePrice: parameter?.basePrice,
          feedInPrice: parameter?.feedInPrice,
          belcodisc: parameter?.belcodisc,
          ra_fee: parameter?.ra_fee,
          export_rate: parameter?.export_rate,
          tier1: parameter?.tier1,
          tier2: parameter?.tier2,
          tier3: parameter?.tier3,
          scaling: customer?.scaling_factor,
          price: customer?.price,
          fixedFeeSaving: 54.37,
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
          total_revenue: billResult.finalRevenue.toFixed(2), // Ensure this is calculated
          savings: billResult.savings.toFixed(2),
          belco_revenue: billResult.belcoRevenue.toFixed(2),
          greenlight_revenue: billResult.greenlightRevenue.toFixed(2),
        };
      })
      .filter(Boolean); // Filter out any null values (invalid bills)

    console.log("Bills to process:", billsToProcess);

    let successCount = 0;
    let failureCount = 0;

    // Loop over each bill and process it
    for (const billData of billsToProcess) {
      console.log("Processing bill:", billData);

      try {
        // Now directly send the email (without calling handlePostBill)
        await handleEmailBill(billData); // Send the email with the bill
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
      toast.dismiss(toastID);

      toast.success(`Successfully emailed all ${successCount} bills!`);
    } else {
      toast.dismiss(toastID);

      toast.error(
        `Successfully emailed ${successCount} bills. Failed to email ${failureCount} bills. Check console for details.`,
      );
    }
    onClose();
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
                      Total Outstanding:
                    </span>
                    <span className="font-semibold text-gray-900">
                      ${summary.totalOutstanding.toFixed(2)}
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
                  {/* Newly Added Sections */}
                  <div className="flex justify-between border-b border-gray-300 pb-2">
                    <span className="font-medium text-gray-700">
                      Total Belco Revenue:
                    </span>
                    <span className="font-semibold text-gray-900">
                      ${summary.totalBelcoRevenue.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-gray-300 pb-2">
                    <span className="font-medium text-gray-700">
                      Total Greenlight Revenue:
                    </span>
                    <span className="font-semibold text-gray-900">
                      ${summary.totalGreenlightRevenue.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-gray-300 pb-2">
                    <span className="font-medium text-gray-700">
                      Total Savings:
                    </span>
                    <span className="font-semibold text-gray-900">
                      ${summary.totalSavings.toFixed(2)}
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
                const customer = customers.find((c) => c.id === customerId);
                if (!customer) return null;

                const parameter = parameters[0];
                const bill = bills[0];

                // Find the balance for the current customer from the fetched list
                const customerBalanceEntry = customerBalance.find(
                  (balance) => balance.customer_id === customerId,
                );

                // Get the current_balance or default to 0

                const customerEnergySums = energySums?.[customerId] || {};
                const consumptionValue = customerEnergySums?.Consumption || 500;
                const exportValue = customerEnergySums?.FeedIn || 50;
                const productionValue = customerEnergySums?.Production || 0;
                const selfConsumptionValue =
                  typeof customerEnergySums?.SelfConsumption === "number"
                    ? customerEnergySums.SelfConsumption
                    : 0;

                console.log(`Customer Energy Data - ID: ${customerId}`);
                console.log("Consumption:🌹🌹🌹", consumptionValue);
                console.log("FeedIn (Export):", exportValue);
                console.log("Self Consumption 🤦‍♀️🤦‍♀️🤦‍♀️:", selfConsumptionValue);
                console.log("Total Production 🍤🍤🍤🍤:", productionValue);

                const billResult = calculateBilling({
                  energyConsumed: consumptionValue,
                  energyExported: exportValue,
                  selfConsumption: selfConsumptionValue,
                  totalProduction: productionValue, // Add this line

                  startDate: new Date(startDate || ""),
                  endDate: new Date(endDate || ""),
                  fuelRate: parameter?.fuelRate,
                  basePrice: parameter?.basePrice,
                  feedInPrice: parameter?.feedInPrice,
                  belcodisc: parameter?.belcodisc,
                  ra_fee: parameter?.ra_fee,
                  export_rate: parameter?.export_rate,
                  tier1: parameter?.tier1,
                  tier2: parameter?.tier2,
                  tier3: parameter?.tier3,
                  scaling: customer?.scaling_factor,
                  price: customer?.price,
                  fixedFeeSaving: 54.37,
                });

                const outstandingBalance =
                  customerBalanceEntry?.current_balance || 0;
                // -(billResult?.finalRevenue || 0);
                return (
                  <div
                    key={customerId}
                    className="mb-8 rounded-lg border border-gray-200 bg-gray-50 p-4"
                  >
                    {/* top section */}
                    <div className="relative flex flex-col pr-0 pt-0">
                      {/* Name and cross button            */}
                      <div className="mb-1">
                        <div className="flex w-full justify-between">
                          <h3 className="text-lg font-semibold text-gray-700">
                            {customer?.site_name}
                          </h3>
                          <button
                            className="  rounded bg-red-200 px-2 py-1 text-red-800 hover:bg-red-300"
                            onClick={() => handleRemoveBill(customerId)}
                          >
                            <FontAwesomeIcon icon={faTimes} />{" "}
                          </button>
                        </div>
                      </div>

                      {/* email and billing */}
                      <div className="mb-4 flex justify-between border-b-2 border-dashed pb-2">
                        <p className="text-sm text-gray-500">
                          <strong className="text-base text-gray-dark">
                            Email:
                          </strong>{" "}
                          {customer?.email || "N/A"} <br />
                          <strong className="text-base text-gray-dark">
                            Address:
                          </strong>{" "}
                          {customer?.address || "N/A"}
                        </p>
                        <div className="flex flex-col items-end">
                          <strong className="text-base text-gray-dark">
                            Billing Period:
                          </strong>
                          <span className="text-sm text-gray-6">
                            {startDate} to {endDate}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Invoice Section */}
                    <div className="mb-4 grid grid-cols-2 gap-4 text-sm text-gray-600">
                      <div>
                        <p>
                          <strong>Total Consumed PTS:</strong>{" "}
                          {consumptionValue.toFixed(2)}
                        </p>
                        <p>
                          <strong>FeedIn:</strong> {exportValue.toFixed(2)} kWh
                        </p>
                        <p>
                          <strong>Energy Rate:</strong> ${" "}
                          {billResult.belcoPerKwh.toFixed(2)}/kWh
                        </p>
                        <p>
                          <strong>Belco Revenue:</strong> ${" "}
                          {billResult.belcoRevenue.toFixed(2)}
                        </p>
                      </div>
                      <div>
                        <p>
                          <strong>Total:</strong> ${" "}
                          {billResult.finalRevenue.toFixed(2)}
                        </p>
                        <p>
                          <strong>Outstanding:</strong> $
                          {outstandingBalance.toFixed(2)}
                        </p>
                        <p>
                          <strong>Greenlight Revenue:</strong> ${" "}
                          {billResult.greenlightRevenue.toFixed(2)}
                        </p>
                        <p>
                          <strong>Savings:</strong> ${" "}
                          {billResult.savings.toFixed(2)}
                        </p>
                        {/* <p>
                          <strong>Description:</strong> sample description
                        </p> */}
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
                  Post and Email
                </button>
                <button
                  onClick={handlePostAllBills}
                  className="rounded bg-dark-2 px-4 py-2 font-medium text-white hover:bg-dark"
                >
                  Post Bills
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
