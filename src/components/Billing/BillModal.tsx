"use client";

import React from "react";
import { Dialog } from "@/components/ui/Dialog";
import { calculateBilling } from "@/utils/bill-calculate/billingutils";
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
            status: billData.status,

            total_cost: billData.belcoTotal.toFixed(2),
            energy_rate: billData.belcoPerKwh.toFixed(2),
            total_revenue: billData.finalRevenue.toFixed(2),
            total_PTS: billData.totalpts || 666999,
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

        const billResult = calculateBilling({
          energyConsumed: 500,
          startDate: new Date(startDate || ""),
          endDate: new Date(endDate || ""),
          fuelRate: 0.14304,
          energyExported: 150,
          basePrice: 0.15,
          feedInPrice: 0.5,
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
          total_PTS: billResult.totalpts || 666999,
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

            const billResult = calculateBilling({
              energyConsumed: 500,
              startDate: new Date(startDate || ""),
              endDate: new Date(endDate || ""),
              fuelRate: 0.14304,
              energyExported: 50,
              basePrice: 0.15,
              feedInPrice: 0.5,
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
              total_PTS: billResult.totalpts || 69,
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
                      <strong>Total PTS:</strong>
                      {billResult.totalpts.toFixed(2)}
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
