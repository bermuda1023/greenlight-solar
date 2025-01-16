"use client";

import React from "react";
import { Dialog } from "@/components/ui/Dialog";
import { calculateSolarBill } from "@/utils/bill-calculate/calculateSolarBill";
import { supabase } from "@/utils/supabase/browserClient";

interface BillModalProps {
  selectedCustomers: string[];
  customers: any[];
  startDate: string | null;
  endDate: string | null;
  onClose: () => void;
}

const BillModal: React.FC<BillModalProps> = ({
  selectedCustomers,
  customers,
  startDate,
  endDate,
  onClose,
}) => {
  const handlePostBill = async (billData: any) => {
    try {
      const invoiceNumber = await generateInvoiceNumber();
      const { data: existingBills, error: fetchError } = await supabase
        .from("monthly_bills")
        .select("id")
        .eq("site_name", billData.site_name)
        .eq("email", billData.email)
        .eq("billing_period_start", billData.billing_period_start)
        .eq("billing_period_end", billData.billing_period_end);

      if (fetchError) {
        throw fetchError;
      }

      let result;
      // If we found an existing bill, update it
      if (existingBills && existingBills.length > 0) {
        result = await supabase
          .from("monthly_bills")
          .update({
            production_kwh: billData.production_kwh,
            self_consumption_kwh: billData.self_consumption_kwh,
            export_kwh: billData.export_kwh,
            total_cost: billData.total_cost,
            energy_rate: billData.energy_rate,
            total_revenue: billData.total_revenue,
            savings: billData.savings,
            status: billData.status,
          })
          .eq("id", existingBills[0].id);
      } else {
        // Insert new bill if none exists
        result = await supabase.from("monthly_bills").insert([
          {
            ...billData,
            invoice_number: invoiceNumber,
          },
        ]);
      }

      if (result.error) throw result.error;
      return true;
    } catch (error) {
      console.error("Error handling bill:", error);
      return false;
    }
  };

  const generateInvoiceNumber = async (): Promise<string> => {
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, ""); // YYYYMMDD format
    const { count, error } = await supabase
      .from("monthly_bills")
      .select("*", { count: "exact" })
      .like("invoice_number", `INV-${today}-%`);

    if (error) throw new Error("Error fetching invoice count");

    const sequentialNumber = (count || 0) + 1; // Increment based on today's count
    return `INV-${today}-${sequentialNumber.toString().padStart(3, "0")}`;
  };

  const handlePostAllBills = async () => {
    const billsToProcess = selectedCustomers
      .map((customerId) => {
        const customer = customers.find((c) => c.id === customerId);
        if (!customer) return null;

        const billResult = calculateSolarBill({
          consumption: customer?.consump_kwh || 0,
          selfConsumption: customer?.self_cons_kwh || 0,
          export: customer?.export_kwh || 0,
          production: customer?.production_kwh || 0,
          price: parseFloat(customer?.price_cap) || 0.31,
          feedInPrice: customer?.feed_in_price || 0.1915,
          scaling: customer?.scaling || 1,
          fixedFeeSaving: customer?.fixed_fee_saving || 54.37,
          startDate: new Date(startDate || ""),
          endDate: new Date(endDate || ""),
          fuelRate: 0.14304,
        });

        return {
          customer_id: customer.id,
          site_name: customer?.site_name || "N/A",
          email: customer?.email || "N/A",
          address: customer?.address || "N/A",
          billing_period_start: startDate,
          billing_period_end: endDate,
          production_kwh: customer?.production_kwh || 0,
          self_consumption_kwh: customer?.self_cons_kwh || 0,
          export_kwh: customer?.export_kwh || 0,
          total_cost: billResult.totalBelcoCost.toFixed(2),
          energy_rate: billResult.effectiveRate.toFixed(2),
          total_revenue: billResult.revenue.toFixed(2),
          savings: billResult.savings.toFixed(2),
          status: "Pending",
        };
      })
      .filter(Boolean);

    let successCount = 0;
    let failureCount = 0;

    for (const billData of billsToProcess) {
      const success = await handlePostBill(billData);
      if (success) {
        successCount++;
      } else {
        failureCount++;
      }
    }

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
        className="fixed inset-0 z-50 flex items-center justify-center bg-gray-3/50 backdrop-blur-sm"
        onClick={onClose}
      >
        <div
          className="max-h-[80vh] w-2/3 overflow-y-auto rounded-lg bg-white p-8 shadow-xl dark:bg-gray-dark"
          onClick={(e) => e.stopPropagation()}
        >
          <h2 className="mb-6 text-center text-2xl font-bold">
            Billing Summary
          </h2>

          {selectedCustomers.map((customerId) => {
            const customer = customers.find((c) => c.id === customerId);

            if (!customer) return null;

            const billResult = calculateSolarBill({
              consumption: customer?.consump_kwh || 0,
              selfConsumption: customer?.self_cons_kwh || 0,
              export: customer?.export_kwh || 0,
              production: customer?.production_kwh || 0,
              price: parseFloat(customer?.price_cap) || 0,
              feedInPrice: customer?.feed_in_price || 0.1,
              scaling: customer?.scaling || 1,
              fixedFeeSaving: customer?.fixed_fee_saving || 0,
              startDate: new Date(startDate || ""),
              endDate: new Date(endDate || ""),
              fuelRate: 0.14304,
            });

            const balanceStatus =
              billResult.savings > 0
                ? "Credit"
                : billResult.savings < 0
                  ? "Balance Due"
                  : "No Balance";
            const balanceAmount = Math.abs(billResult.savings).toFixed(2);

            const billData = {
              site_name: customer?.site_name || "N/A",
              email: customer?.email || "N/A",
              address: customer?.address || "N/A",
              billing_period_start: startDate,
              billing_period_end: endDate,
              production_kwh: customer?.production_kwh || 0,
              self_consumption_kwh: customer?.self_cons_kwh || 0,
              export_kwh: customer?.export_kwh || 0,
              total_cost: billResult.totalBelcoCost.toFixed(2),
              energy_rate: billResult.effectiveRate.toFixed(2),
              total_revenue: billResult.revenue.toFixed(2),
              savings: billResult.savings.toFixed(2),
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
                      <strong>Email:</strong> {customer?.email || "N/A"} <br />
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
                      <strong>Energy Produced:</strong>{" "}
                      {customer?.production_kwh || "N/A"} kWh
                    </p>
                    <p>
                      <strong>Self Consumption:</strong>{" "}
                      {customer?.self_cons_kwh || "N/A"} kWh
                    </p>
                    <p>
                      <strong>Energy Exported:</strong>{" "}
                      {customer?.export_kwh || "N/A"} kWh
                    </p>
                  </div>
                  <div>
                    <p>
                      <strong>Total Cost:</strong> $
                      {billResult.totalBelcoCost.toFixed(2)}
                    </p>
                    <p>
                      <strong>Energy Rate:</strong> $
                      {billResult.effectiveRate.toFixed(2)}/kWh
                    </p>
                    <p>
                      <strong>Total Revenue:</strong> $
                      {billResult.revenue.toFixed(2)}
                    </p>
                    <p>
                      <strong>Savings:</strong> ${billResult.savings.toFixed(2)}
                    </p>
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="flex items-end justify-between">
                  <div className="text-sm text-gray-500">
                    <p>Generated on: {new Date().toLocaleDateString()}</p>
                  </div>
                  <div className="flex gap-2">
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

          {/* Modal Actions */}
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
        </div>
      </div>
    </Dialog>
  );
};

export default BillModal;
