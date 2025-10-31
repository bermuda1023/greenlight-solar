"use client";
import html2pdf from "html2pdf.js";
import React, { useCallback, useEffect, useState, useRef } from "react";
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
  interest_rate: number;
  belcodisc: number;
  export_rate: number;
  message?: string;
  emailmsg?: string;
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
  payment_allocations?: PaymentAllocation[];
}

interface PaymentAllocation {
  payment_id: string;
  amount_allocated: number;
  allocation_date: string;
}

interface CustomerData {
  id: string;
  site_ID: number;
  solar_api_key: string;
  refresh_token?: string; // Added for Enphase customers
  site_name?: string; // Ensure this is defined
  email?: string; // Ensure this is defined
  address?: string; // Ensure this is defined
  scaling_factor?: number;
  price?: number;
  belco_rate?: number; // Belco rate from database
}

// Enhanced error tracking interface
interface EnergyDataError {
  customerId: string;
  errorType: 'API_ERROR' | 'ZERO_PRODUCTION' | 'NO_DATA' | 'INVALID_RESPONSE' | 'TOKEN_EXPIRED' | 'NETWORK_ERROR';
  errorMessage: string;
  httpStatus?: number;
  timestamp: string;
  needsReauthorization?: boolean;
}

interface EnergyDataResult {
  customerId: string;
  energySums?: {
    Consumption: number;
    FeedIn: number;
    Production: number;
    SelfConsumption: number;
  };
  error?: EnergyDataError;
  hasError: boolean;
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

  // Track energy data errors for better error handling
  const [energyDataErrors, setEnergyDataErrors] = useState<{
    [customerId: string]: EnergyDataError;
  }>({});

  // State for manual overdue adjustments
  const [overdueAdjustments, setOverdueAdjustments] = useState<{
    [customerId: string]: number;
  }>({});

  const [showAdjustmentModal, setShowAdjustmentModal] = useState<string | null>(null);
  // ADDED: classification + UI state
  const [activeTab, setActiveTab] = useState<"success" | "failed">("success");
  const [successfulBills, setSuccessfulBills] = useState<any[]>([]);
  const [failedBills, setFailedBills] = useState<any[]>([]);

  // Track if we've shown the summary toast to avoid duplicates
  const hasShownSummaryToast = useRef(false);


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
      const errors: { [customerId: string]: EnergyDataError } = {};

      // Fetch energy data for each customer individually
      const energyDataPromises = customerData.map(async (customer): Promise<EnergyDataResult> => {
        let proxyUrl;
        let response;

        // Determine which API to use based on the customer type
        if (customer.refresh_token) {
          // For Enphase customers (those with refresh_token)
          console.log(`Using Enphase API for customer ${customer.id}`);
          proxyUrl = `/api/enphase-energy-data?startTime=${encodeURIComponent(
            formattedStartDate,
          )}&endTime=${encodeURIComponent(
            formattedEndDate,
          )}&siteId=${customer.site_ID}&customerId=${customer.id}`;
        } else {
          // For SolarEdge customers
          console.log(`Using SolarEdge API for customer ${customer.id}`);
          proxyUrl = `/api/proxy-energy-data?startTime=${encodeURIComponent(
            formattedStartDate,
          )}&endTime=${encodeURIComponent(
            formattedEndDate,
          )}&siteid=${customer.site_ID}&api_key=${customer.solar_api_key}`;
        }

        console.log(`Fetching energy data from: ${proxyUrl}`);

        try {
          response = await fetch(proxyUrl);

          if (!response.ok) {
            const errorText = await response.text();
            const error: EnergyDataError = {
              customerId: customer.id,
              errorType: 'API_ERROR',
              errorMessage: `HTTP ${response.status}: ${errorText}`,
              httpStatus: response.status,
              timestamp: new Date().toISOString(),
            };
            errors[customer.id] = error;

            return {
              customerId: customer.id,
              hasError: true,
              error,
            };
          }

          const data = await response.json();

          // Check for token expiration
          if (data.tokenExpired) {
            console.warn(`Enphase token expired for customer ${customer.id}:`, data.message);

            const error: EnergyDataError = {
              customerId: customer.id,
              errorType: 'TOKEN_EXPIRED',
              errorMessage: data.message || 'Enphase authorization expired',
              timestamp: new Date().toISOString(),
              needsReauthorization: true,
            };
            errors[customer.id] = error;

            return {
              customerId: customer.id,
              hasError: true,
              error,
            };
          }

          // Check for API errors
          if (data.apiError) {
            console.warn(`Enphase API error for customer ${customer.id}:`, data.message);

            const error: EnergyDataError = {
              customerId: customer.id,
              errorType: 'API_ERROR',
              errorMessage: data.message || data.error || 'Enphase API issue',
              timestamp: new Date().toISOString(),
            };
            errors[customer.id] = error;

            return {
              customerId: customer.id,
              hasError: true,
              error,
            };
          }

          // Validate the response structure
          if (!data || !data.energyDetails || !Array.isArray(data.energyDetails.meters)) {
            const error: EnergyDataError = {
              customerId: customer.id,
              errorType: 'INVALID_RESPONSE',
              errorMessage: 'Invalid energy data structure: missing energyDetails or meters array',
              timestamp: new Date().toISOString(),
            };
            errors[customer.id] = error;

            return {
              customerId: customer.id,
              hasError: true,
              error,
            };
          }

          // Calculate energy sums for this specific customer
          const customerEnergySums: {
            Consumption: number;
            FeedIn: number;
            Production: number;
            SelfConsumption: number;
          } = {
            Consumption: 0,
            FeedIn: 0,
            Production: 0,
            SelfConsumption: 0,
          };

          data.energyDetails.meters.forEach((meter: any) => {
            if (!meter.type || !Array.isArray(meter.values)) {
              console.warn(`Invalid meter data for customer ${customer.id}:`, meter);
              return;
            }

            try {
              const meterValue = meter.values.reduce(
                (sum: number, value: any) => {
                  const numValue = parseFloat(value?.value || 0);
                  return sum + (isNaN(numValue) ? 0 : numValue);
                },
                0,
              ) / 1000; // Convert to kWh

              if (meter.type === 'Consumption') customerEnergySums.Consumption = meterValue;
              else if (meter.type === 'FeedIn') customerEnergySums.FeedIn = meterValue;
              else if (meter.type === 'Production') customerEnergySums.Production = meterValue;
              else if (meter.type === 'SelfConsumption') customerEnergySums.SelfConsumption = meterValue;
            } catch (meterError) {
              console.error(`Error processing meter ${meter.type} for customer ${customer.id}:`, meterError);
            }
          });

          // Check for zero production
          if (customerEnergySums.Production === 0) {
            const error: EnergyDataError = {
              customerId: customer.id,
              errorType: 'ZERO_PRODUCTION',
              errorMessage: 'No solar production data detected for this billing period',
              timestamp: new Date().toISOString(),
            };
            errors[customer.id] = error;
          }

          console.log(
            `Computed Energy Sums for Customer ${customer.id}:`,
            customerEnergySums,
          );

          return {
            customerId: customer.id,
            energySums: customerEnergySums,
            hasError: false,
          };

        } catch (fetchError) {
          console.error(`Failed to fetch energy data for customer ${customer.id}:`, fetchError);

          const error: EnergyDataError = {
            customerId: customer.id,
            errorType: 'NETWORK_ERROR',
            errorMessage: fetchError instanceof Error ? fetchError.message : 'Unknown network error',
            timestamp: new Date().toISOString(),
          };
          errors[customer.id] = error;

          return {
            customerId: customer.id,
            hasError: true,
            error,
          };
        }
      });

      // Wait for all energy data to be fetched
      const energyDataResults = await Promise.all(energyDataPromises);

      // Create an object to store individual customer energy sums
      const individualCustomerEnergySums: {
        [key: string]: { [key: string]: number };
      } = {};

      energyDataResults.forEach((result) => {
        if (result.energySums) {
          individualCustomerEnergySums[result.customerId] = result.energySums;
        }
      });

      // Set the energy sums and errors
      setEnergySums(individualCustomerEnergySums);
      setEnergyDataErrors(errors);

      // Show summary toast for errors only once
      if (!hasShownSummaryToast.current && Object.keys(errors).length > 0) {
        const tokenExpiredErrors = Object.values(errors).filter(e => e.errorType === 'TOKEN_EXPIRED');
        const apiErrors = Object.values(errors).filter(e => e.errorType === 'API_ERROR');
        const otherErrors = Object.values(errors).filter(e =>
          e.errorType !== 'TOKEN_EXPIRED' && e.errorType !== 'API_ERROR'
        );

        const messages: string[] = [];

        // Helper function to get customer names
        const getCustomerNames = (errorList: EnergyDataError[]) => {
          return errorList.map(error => {
            const customer = customerData.find(c => c.id === error.customerId);
            return customer?.site_name || customer?.email || error.customerId;
          });
        };

        if (tokenExpiredErrors.length > 0) {
          const names = getCustomerNames(tokenExpiredErrors);
          if (names.length <= 2) {
            messages.push(`${names.join(', ')} need${names.length === 1 ? 's' : ''} re-authorization`);
          } else {
            messages.push(`${names.slice(0, 2).join(', ')} and ${names.length - 2} other${names.length - 2 > 1 ? 's' : ''} need re-authorization`);
          }
        }

        if (apiErrors.length > 0) {
          const names = getCustomerNames(apiErrors);
          if (names.length <= 2) {
            messages.push(`API error for ${names.join(', ')}`);
          } else {
            messages.push(`API errors for ${names.slice(0, 2).join(', ')} and ${names.length - 2} other${names.length - 2 > 1 ? 's' : ''}`);
          }
        }

        if (otherErrors.length > 0) {
          const names = getCustomerNames(otherErrors);
          if (names.length <= 2) {
            messages.push(`Issues with ${names.join(', ')}`);
          } else {
            messages.push(`Issues with ${names.slice(0, 2).join(', ')} and ${names.length - 2} other${names.length - 2 > 1 ? 's' : ''}`);
          }
        }

        const toastMessage = `${messages.join('; ')}. Check the Failed Bills tab for details.`;
        toast.warning(toastMessage, { autoClose: 6000 });
        hasShownSummaryToast.current = true;
      }

      setLoading(false);
    } catch (err) {
      console.error("Error in fetchEnergyData:", err);
      setError(
        err instanceof Error ? err.message : "Error fetching energy data",
      );
      setLoading(false);
    }
  }, [startDate, endDate, customerData]);

  // classify bills once energySums + parameters are ready
const classifyBills = useCallback(() => {
  if (!energySums || !parameters?.length) return;

  const parameter = parameters[0];
  const newSuccess: any[] = [];
  const newFailed: any[] = [];

  selectedBills.forEach((customerId) => {
    const customer = customers.find((c) => c.id === customerId);
    if (!customer) return;

    const sums = energySums?.[customerId];
    const error = energyDataErrors[customerId];

    // Priority 1: Check for explicit errors from API calls
    if (error) {
      let reason = '';
      let issue = '';
      let actionRequired = '';

      switch (error.errorType) {
        case 'TOKEN_EXPIRED':
          reason = 'Enphase Token Expired';
          issue = 'Customer needs re-authorization';
          actionRequired = 'Re-authorize customer in Enphase portal';
          break;
        case 'API_ERROR':
          reason = `API Error: ${error.errorMessage}`;
          issue = 'Failed to retrieve energy data from API';
          actionRequired = 'Check API credentials and service status';
          break;
        case 'ZERO_PRODUCTION':
          reason = 'Zero Production Detected';
          issue = 'No solar energy production during billing period';
          actionRequired = 'Verify solar system is operational';
          break;
        case 'INVALID_RESPONSE':
          reason = 'Invalid API Response';
          issue = error.errorMessage;
          actionRequired = 'Contact API provider or check data format';
          break;
        case 'NETWORK_ERROR':
          reason = 'Network/Connection Error';
          issue = error.errorMessage;
          actionRequired = 'Check internet connection and retry';
          break;
        case 'NO_DATA':
          reason = 'No Energy Data Available';
          issue = 'API returned no data for billing period';
          actionRequired = 'Verify date range and customer setup';
          break;
        default:
          reason = 'Unknown Error';
          issue = error.errorMessage;
          actionRequired = 'Review error logs and customer configuration';
      }

      newFailed.push({
        customerId,
        customer,
        reason,
        issue,
        actionRequired,
        errorType: error.errorType,
        errorDetails: error,
        timestamp: error.timestamp,
      });
      return;
    }

    // Priority 2: Check for missing energy data
    if (!sums) {
      newFailed.push({
        customerId,
        customer,
        reason: 'No Energy Data',
        issue: 'Energy data not available for this customer',
        actionRequired: 'Verify customer API configuration and retry',
        errorType: 'NO_DATA',
      });
      return;
    }

    const production = sums.Production ?? 0;
    const consumption = sums.Consumption ?? 0;
    const exportVal = sums.FeedIn ?? 0;
    const selfCons = sums.SelfConsumption ?? 0;

    // Priority 3: Check for zero production (if not already caught by error)
    if (production === 0) {
      newFailed.push({
        customerId,
        customer,
        reason: 'Zero Production',
        issue: 'No solar energy production during billing period',
        actionRequired: 'Check if solar panels are functioning properly',
        errorType: 'ZERO_PRODUCTION',
        energy: { consumption, production, feedIn: exportVal, selfConsumption: selfCons },
      });
      return;
    }

    // Priority 4: Attempt to calculate billing
    let billResult;
    try {
      billResult = calculateBilling({
        energyConsumed: consumption,
        energyExported: exportVal,
        selfConsumption: selfCons,
        totalProduction: production,
        startDate: new Date(startDate || ""),
        endDate: new Date(endDate || ""),
        belcodisc: parameter?.belcodisc || 0,
        export_rate: parameter?.export_rate || 0,
        price: customer?.price || 0,
        belcoRate: customer?.belco_rate || 0,
        scaling: customer?.scaling_factor || 1.0,
      });
    } catch (calcError) {
      newFailed.push({
        customerId,
        customer,
        reason: 'Billing Calculation Failed',
        issue: calcError instanceof Error ? calcError.message : 'Unknown calculation error',
        actionRequired: 'Review customer rates and billing parameters',
        errorType: 'INVALID_RESPONSE',
        energy: { consumption, production, feedIn: exportVal, selfConsumption: selfCons },
      });
      return;
    }

    // Priority 5: Validate billing results
    if (
      !billResult ||
      isNaN(billResult.finalRevenue) ||
      !isFinite(billResult.finalRevenue) ||
      isNaN(billResult.effectiveRate) ||
      !isFinite(billResult.effectiveRate)
    ) {
      newFailed.push({
        customerId,
        customer,
        reason: 'Invalid Billing Data',
        issue: 'Calculation resulted in invalid values (NaN or Infinity)',
        actionRequired: 'Review customer pricing parameters and energy data',
        errorType: 'INVALID_RESPONSE',
        energy: { consumption, production, feedIn: exportVal, selfConsumption: selfCons },
      });
      return;
    }

    // Success: Bill can be processed
    const balEntry = customerBalance.find(
      (b) => b.customer_id === customerId
    );
    const outstanding = balEntry?.current_balance ?? 0;

    newSuccess.push({
      customerId,
      customer,
      billResult,
      outstanding,
      energy: { consumption, production, feedIn: exportVal, selfConsumption: selfCons }
    });
  });

  setSuccessfulBills(newSuccess);
  setFailedBills(newFailed);
}, [energySums, energyDataErrors, parameters, selectedBills, customers, customerBalance, startDate, endDate]);

// auto-classify whenever inputs change
useEffect(() => {
  classifyBills();
}, [classifyBills]);

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


// Type-safe fix for mixed string/number customer IDs
const handleRemoveBill = (customerId: number | string) => {
  setSelectedBills((prev) =>
    prev.filter((id) => String(id) !== String(customerId))
  );
  setSuccessfulBills((prev) =>
    prev.filter((b) => String(b.customerId) !== String(customerId))
  );
  setFailedBills((prev) =>
    prev.filter((b) => String(b.customerId) !== String(customerId))
  );
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
            // payment_allocations: [], // Initialize empty payment allocations
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
    toast.info("Processing...");

    // Only process successful bills
    const billsToProcess = successfulBills
      .map((bill) => {
        const { customer, billResult, energy } = bill;
        if (!customer) return null;

        const previousArrears = customer.previousArrears || 0;
        const totalBillAmount =
          Number(billResult.finalRevenue) + previousArrears;

        return {
          customer_id: customer.id,
          site_name: customer.site_name || "N/A",
          email: customer.email || "N/A",
          address: customer.address || "N/A",
          billing_period_start: startDate,
          billing_period_end: endDate,
          total_cost: billResult.belcoTotal.toFixed(2),
          energy_rate: billResult.effectiveRate.toFixed(3),
          total_revenue: billResult.finalRevenue.toFixed(2),
          total_PTS: energy.production || 0,
          status: "Pending",
          arrears: previousArrears,
          total_bill: totalBillAmount,
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

      // ✅ Use effective rate from billData (already calculated by billingutils)
      const effectiveRate = billData.energy_rate || "0.000";

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
         <p style="color: black;">We hope this message finds you well!</p>
         <p style="color: black;">Your latest invoice for the month of ${monthYear} has been generated, and the total amount due is $${billData.total_revenue}. Please take a moment to review your bill and proceed with payment at your earliest convenience.</p>
         <p style="color: black;">If you have any questions or need assistance, feel free to reach out to our support team. We're here to help!</p>
         <p style="color: black;">Thank you for being a valued customer.</p>
         <p style="color: black;">Best regards,<br>Greenlight Energy <br>billing@greenlightenergy.bm <br>Phone: 1 (441) 705 3033</p>`
          : `<p style="color: black;">Dear ${billData?.site_name},</p>
         <p style="color: black;">We hope this message finds you well!</p>
         <p style="color: black;">Your latest invoice for the month of ${monthYear} has been generated, and the total amount due is $${billData.total_revenue}. Please take a moment to review your bill and proceed with payment at your earliest convenience.</p>
         <p style="color: black;">If you have any questions or need assistance, feel free to reach out to our support team. We're here to help!</p>
         <p style="color: black;">Thank you for being a valued customer.</p>
         <p style="color: black;">Best regards,<br>Greenlight Energy <br>billing@greenlightenergy.bm <br>Phone: 1 (441) 705 3033</p>`;
      console.log(Emailmessage);

      // Display the generated email message

      // ✅ Generate Invoice HTML Template (matching ViewBillModal.tsx format)
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
            <td class="pr-4 text-sm font-semibold text-black">Effective Rate:</td>
            <td class="text-xs">${effectiveRate}c</td>
          </tr>
        </tbody>
      </table>
    </section>

    <!-- Billing Details -->
    <table class="mb-10 w-full text-left text-sm">
      <thead class="border-b-2 border-green-300 text-gray-700">
        <tr>
          <th class="p-3 text-sm">Period Start</th>
          <th class="p-3 text-sm">Period End</th>
          <th class="p-3 text-sm">Description</th>
          <th class="p-3 text-sm">Production (kWh)</th>
          <th class="p-3 text-sm">Effective Rate</th>
          <th class="p-3 text-sm">Total</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td class="p-3 text-xs text-gray-600">${billData.billing_period_start}</td>
          <td class="p-3 text-xs text-gray-600">${billData.billing_period_end}</td>
          <td class="p-3 text-xs text-gray-600">Solar Energy Consumption</td>
          <td class="p-3 text-xs text-gray-600">${billData.total_PTS.toFixed(2)}</td>
          <td class="p-3 text-xs text-gray-600">${effectiveRate}c</td>
          <td class="p-3 text-xs text-gray-600">$${billData.total_revenue}</td>
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
        <span class="ml-20 w-20">$ ${balanceDue.toFixed(2)}</span>
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

        const emailsubject = `Greenlight E-Bill : ${monthYear}`;
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

    // Only process successful bills
    const billsToProcess = successfulBills
      .map((bill) => {
        const { customer, billResult, energy } = bill;
        if (!customer) return null;

        return {
          customer_id: customer.id,
          site_name: customer.site_name || "N/A",
          email: customer.email || "N/A",
          address: customer.address || "N/A",
          billing_period_start: startDate,
          billing_period_end: endDate,
          total_cost: billResult.belcoTotal.toFixed(2),
          energy_rate: billResult.effectiveRate.toFixed(3),
          total_PTS: energy.production || 0,
          status: "Pending",
          total_revenue: billResult.finalRevenue.toFixed(2),
          savings: billResult.savings.toFixed(2),
          belco_revenue: billResult.belcoRevenue.toFixed(2),
          greenlight_revenue: billResult.greenlightRevenue.toFixed(2),
        };
      })
      .filter(Boolean);

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
            {/* Tab Navigation */}
            <div className="mb-6 flex gap-2 border-b-2 border-gray-200">
              <button
                onClick={() => setActiveTab("success")}
                className={`px-6 py-3 font-semibold transition-all ${
                  activeTab === "success"
                    ? "border-b-4 border-green-500 text-green-600"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                Successful Bills ({successfulBills.length})
              </button>
              <button
                onClick={() => setActiveTab("failed")}
                className={`px-6 py-3 font-semibold transition-all ${
                  activeTab === "failed"
                    ? "border-b-4 border-red-500 text-red-600"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                Failed Bills ({failedBills.length})
              </button>
            </div>

            {/* Successful Bills Tab */}
            {activeTab === "success" && (
              <div className="space-y-8">
                {successfulBills.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">No successful bills found</p>
                ) : (
                  successfulBills.map((bill) => {
                    const { customerId, customer, billResult, outstanding, energy } = bill;

                    return (
                      <div
                        key={customerId}
                        className="rounded-lg border-2 border-green-300 bg-white p-6 shadow-md"
                      >
                        {/* Header */}
                        <div className="flex justify-between items-start mb-4 border-b-2 border-green-200 pb-3">
                          <div>
                            <h3 className="text-xl font-bold text-gray-800">
                              {customer?.site_name}
                            </h3>
                            <p className="text-sm text-gray-600">{customer?.email}</p>
                          </div>
                          <button
                            className="rounded bg-red-500 px-3 py-1.5 text-white hover:bg-red-600 transition"
                            onClick={() => handleRemoveBill(customerId)}
                          >
                            <FontAwesomeIcon icon={faTimes} />
                          </button>
                        </div>

                        {/* Billing Period */}
                        <div className="bg-blue-50 p-3 rounded mb-3">
                          <h4 className="font-semibold text-gray-700 mb-2">Billing Period</h4>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <p><strong>Number of Days:</strong> {billResult.numberOfDays}</p>
                            <p><strong>Start Date:</strong> {startDate}</p>
                            <p><strong>End Date:</strong> {endDate}</p>
                          </div>
                        </div>

                        {/* Energy Summary */}
                        <div className="bg-yellow-50 p-3 rounded mb-3">
                          <h4 className="font-semibold text-gray-700 mb-2">Energy Data</h4>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <p><strong>Total Production:</strong> {energy.production.toFixed(3)} kWh</p>
                            <p><strong>Feed-In:</strong> {energy.feedIn.toFixed(3)} kWh</p>
                            <p><strong>Consumption:</strong> {energy.consumption.toFixed(3)} kWh</p>
                            <p><strong>Self-Consumption:</strong> {energy.selfConsumption.toFixed(3)} kWh</p>
                          </div>
                        </div>

                        {/* Rates */}
                        <div className="bg-purple-50 p-3 rounded mb-3">
                          <h4 className="font-semibold text-gray-700 mb-2">Rates & Discounts</h4>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <p><strong>Customer Rate:</strong> ${billResult.price.toFixed(2)}</p>
                            <p><strong>Export Rate:</strong> ${billResult.export_rate.toFixed(3)}</p>
                            <p><strong>Belco Discount:</strong> {(billResult.belcodisc*100).toFixed(2)}%</p>
                            <p><strong>Effective Rate:</strong> {billResult.effectiveRate.toFixed(3)}/kWh</p>
                          </div>
                        </div>

                        {/* Revenue */}
                        <div className="bg-green-50 p-3 rounded mb-3">
                          <h4 className="font-semibold text-gray-700 mb-2">Revenue Breakdown</h4>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <p><strong>Rack Rate:</strong> ${billResult.rackRate.toFixed(2)}</p>
                            <p><strong>After Belco Disc:</strong> ${billResult.AfterBelcoDisc.toFixed(2)}</p>
                            <p><strong>Feed-In Credit:</strong> ${billResult.feedInCredit.toFixed(2)}</p>
                            <p><strong>Max Bill:</strong> ${billResult.MaxBill.toFixed(2)}</p>
                          </div>
                        </div>

                        {/* Final Revenue */}
                        <div className="bg-gradient-to-r from-green-100 to-blue-100 p-4 rounded-lg border-2 border-green-400 mb-2">
                          <div className="flex justify-between items-center">
                            <h4 className="text-lg font-bold text-gray-800">Final Revenue:</h4>
                            <span className="text-2xl font-bold text-green-700">
                              ${billResult.finalRevenue.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* Failed Bills Tab */}
            {activeTab === "failed" && (
              <div className="space-y-8">
                {failedBills.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">No failed bills found</p>
                ) : (
                  failedBills.map((bill) => {
                    const { customerId, customer, reason, issue, actionRequired, errorType, errorDetails, timestamp, energy } = bill;

                    // Determine error severity and colors
                    const isTokenExpired = errorType === 'TOKEN_EXPIRED';
                    const isZeroProduction = errorType === 'ZERO_PRODUCTION';
                    const isAPIError = errorType === 'API_ERROR';

                    const borderColor = isTokenExpired ? 'border-orange-400' : 'border-red-300';
                    const bgColor = isTokenExpired ? 'bg-orange-50' : 'bg-red-50';
                    const textColor = isTokenExpired ? 'text-orange-800' : 'text-red-800';

                    return (
                      <div
                        key={customerId}
                        className={`rounded-lg border-2 ${borderColor} bg-white p-6 shadow-md`}
                      >
                        {/* Header */}
                        <div className="flex justify-between items-start mb-4 border-b-2 border-red-200 pb-3">
                          <div>
                            <h3 className="text-xl font-bold text-gray-800">
                              {customer?.site_name}
                            </h3>
                            <p className="text-sm text-gray-600">{customer?.email}</p>
                            {errorType && (
                              <span className={`inline-block mt-1 px-2 py-1 text-xs font-semibold rounded ${
                                isTokenExpired ? 'bg-orange-100 text-orange-800' :
                                isZeroProduction ? 'bg-yellow-100 text-yellow-800' :
                                'bg-red-100 text-red-800'
                              }`}>
                                {errorType.replace(/_/g, ' ')}
                              </span>
                            )}
                          </div>
                          <button
                            className="rounded bg-red-500 px-3 py-1.5 text-white hover:bg-red-600 transition"
                            onClick={() => handleRemoveBill(customerId)}
                          >
                            <FontAwesomeIcon icon={faTimes} />
                          </button>
                        </div>

                        {/* Issue Alert */}
                        <div className={`${bgColor} border-l-4 ${borderColor} p-4 mb-4`}>
                          <div className="flex items-start">
                            <div className="flex-shrink-0">
                              <svg className={`h-5 w-5 ${isTokenExpired ? 'text-orange-400' : 'text-red-400'}`} viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                              </svg>
                            </div>
                            <div className="ml-3 flex-1">
                              <h3 className={`text-sm font-medium ${textColor}`}>
                                {reason}
                              </h3>
                              <div className={`mt-2 text-sm ${isTokenExpired ? 'text-orange-700' : 'text-red-700'}`}>
                                <p><strong>Issue:</strong> {issue}</p>
                                {errorDetails?.httpStatus && (
                                  <p className="mt-1"><strong>HTTP Status:</strong> {errorDetails.httpStatus}</p>
                                )}
                                {timestamp && (
                                  <p className="mt-1 text-xs text-gray-500">
                                    <strong>Time:</strong> {new Date(timestamp).toLocaleString()}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Customer Info */}
                        <div className="bg-gray-50 p-3 rounded mb-3">
                          <h4 className="font-semibold text-gray-700 mb-2">Customer Information</h4>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <p><strong>Site Name:</strong> {customer?.site_name || "N/A"}</p>
                            <p><strong>Email:</strong> {customer?.email || "N/A"}</p>
                            <p><strong>Address:</strong> {customer?.address || "N/A"}</p>
                            <p><strong>Site ID:</strong> {customer?.site_ID || "N/A"}</p>
                            <p><strong>API Type:</strong> {customer?.refresh_token ? 'Enphase' : 'SolarEdge'}</p>
                          </div>
                        </div>

                        {/* Energy Data (if available) */}
                        {energy && (
                          <div className="bg-blue-50 p-3 rounded mb-3">
                            <h4 className="font-semibold text-gray-700 mb-2">Energy Data (Retrieved)</h4>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <p><strong>Production:</strong> {energy.production?.toFixed(3) || 0} kWh</p>
                              <p><strong>Consumption:</strong> {energy.consumption?.toFixed(3) || 0} kWh</p>
                              <p><strong>Feed-In:</strong> {energy.feedIn?.toFixed(3) || 0} kWh</p>
                              <p><strong>Self-Consumption:</strong> {energy.selfConsumption?.toFixed(3) || 0} kWh</p>
                            </div>
                          </div>
                        )}

                        {/* Action Required */}
                        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
                          <div className="flex">
                            <div className="flex-shrink-0">
                              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                              </svg>
                            </div>
                            <div className="ml-3">
                              <p className="text-sm font-semibold text-yellow-800 mb-1">Action Required:</p>
                              <p className="text-sm text-yellow-700">
                                {actionRequired || 'Please verify customer data and API credentials.'}
                              </p>
                              {isZeroProduction && (
                                <p className="mt-2 text-sm text-yellow-700">
                                  Contact the customer to verify their solar system is operational and producing energy.
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* Footer Actions */}
            <div className="mt-6 flex justify-end gap-4">
              <button
                onClick={onClose}
                className="rounded bg-gray-3 px-4 py-2 text-dark-2 hover:bg-gray-4"
              >
                Close
              </button>
              <button
                onClick={handlePostAndEmailAllBills}
                className="rounded bg-green-500 px-4 py-2 text-white hover:bg-green-600"
                disabled={successfulBills.length === 0}
              >
                Post & Email All ({successfulBills.length})
              </button>
              <button
                onClick={handlePostAllBills}
                className="rounded bg-dark-2 px-4 py-2 text-white hover:bg-dark"
                disabled={successfulBills.length === 0}
              >
                Post Only ({successfulBills.length})
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default BillModal;