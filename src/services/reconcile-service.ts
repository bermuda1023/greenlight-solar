import { supabase } from "@/utils/supabase/browserClient";
import { BillingService } from "./billing-service";

export class ReconciliationService {
  private billingService: BillingService;

  constructor() {
    this.billingService = new BillingService();
  }

  private calculateBillStatus(paidAmount: number, totalAmount: number): string {
    if (paidAmount >= totalAmount) {
      return "Fully Paid";
    }
    if (paidAmount === 0) {
      return "Pending";
    }
    return "Partially Matched";
  }

  async matchTransactionToBills(transactionId: string, matchedBills: { billId: string; amount: number }[]) {
    try {
      // Fetch the transaction data
      const { data: transaction, error: txError } = await supabase
        .from("transactions")
        .select("*")
        .eq("id", transactionId)
        .single();

      if (txError || !transaction) {
        throw new Error("Transaction not found");
      }

      // Validate total matched amount
      const totalMatchedAmount = matchedBills.reduce((sum, match) => sum + match.amount, 0);
      if (totalMatchedAmount > transaction.amount) {
        throw new Error("Total matched amount exceeds transaction amount");
      }

      // Update each bill
      for (const match of matchedBills) {
        // Get current bill data
        const { data: currentBill, error: billError } = await supabase
          .from("monthly_bills")
          .select("reconciliation_ids")
          .eq("id", match.billId)
          .single();

        if (billError) {
          throw billError;
        }

        // Update bill with new transaction ID in reconciliation_ids
        const currentReconciliationIds = currentBill.reconciliation_ids || [];
        const updatedReconciliationIds = [...currentReconciliationIds];

        if (!updatedReconciliationIds.includes(transactionId)) {
          updatedReconciliationIds.push(transactionId);
        }

        // Update the bill
        const { error: updateBillError } = await supabase
          .from("monthly_bills")
          .update({
            reconciliation_ids: updatedReconciliationIds
          })
          .eq("id", match.billId);

        if (updateBillError) {
          throw updateBillError;
        }

        // Save the allocation record to track exact amount allocated
        const { error: allocationError } = await supabase
          .from("transaction_bill_allocations")
          .upsert({
            transaction_id: transactionId,
            bill_id: match.billId,
            allocated_amount: match.amount
          }, {
            onConflict: 'transaction_id,bill_id'
          });

        if (allocationError) {
          throw allocationError;
        }

        // Update bill amounts
        await this.billingService.updateBillAmounts(match.billId, match.amount);
      }

      // Update the transaction
      const { error: updateTxError } = await supabase
        .from("transactions")
        .update({
          status: totalMatchedAmount === transaction.amount ? "Matched" : "Partially Matched",
          bill_id: matchedBills[0].billId,
          paid_amount: totalMatchedAmount,
          pending_amount: transaction.amount - totalMatchedAmount
        })
        .eq("id", transactionId);

      if (updateTxError) {
        throw updateTxError;
      }

      return { success: true };
    } catch (error) {
      console.error("Error in matchTransactionToBills:", error);
      throw error;
    }
  }

  async undoTransactionMatch(transactionId: string) {
    try {
      // Fetch the transaction data
      const { data: transaction, error: txError } = await supabase
        .from("transactions")
        .select("*")
        .eq("id", transactionId)
        .single();

      if (txError || !transaction) {
        throw new Error("Transaction not found");
      }

      // Fetch all allocations for this transaction to know which bills were affected and by how much
      const { data: allocations, error: allocError } = await supabase
        .from("transaction_bill_allocations")
        .select("*")
        .eq("transaction_id", transactionId);

      if (allocError) throw allocError;

      // Find all bills that have this transaction ID in their reconciliation_ids
      const { data: bills, error: billsError } = await supabase
        .from("monthly_bills")
        .select("*")
        .contains("reconciliation_ids", [transactionId]);

      if (billsError) throw billsError;

      // Update each bill to remove this transaction ID
      for (const bill of bills || []) {
        const updatedReconciliationIds = (bill.reconciliation_ids || [])
          .filter((id: string) => id !== transactionId);

        const { error: updateBillError } = await supabase
          .from("monthly_bills")
          .update({
            reconciliation_ids: updatedReconciliationIds
          })
          .eq("id", bill.id);

        if (updateBillError) {
          throw updateBillError;
        }

        // Find the exact allocation amount for this bill
        const allocation = allocations?.find(a => a.bill_id === bill.id);
        if (allocation) {
          // Undo the bill payment using the exact allocated amount
          await this.billingService.updateBillAmounts(bill.id, allocation.allocated_amount, true);
        }
      }

      // Delete all allocation records for this transaction
      const { error: deleteAllocError } = await supabase
        .from("transaction_bill_allocations")
        .delete()
        .eq("transaction_id", transactionId);

      if (deleteAllocError) {
        throw deleteAllocError;
      }

      // Reset the transaction
      const { error: updateTxError } = await supabase
        .from("transactions")
        .update({
          status: "Unmatched",
          bill_id: null,
          paid_amount: 0,
          pending_amount: transaction.amount
        })
        .eq("id", transactionId);

      if (updateTxError) {
        throw updateTxError;
      }

      return { success: true };
    } catch (error) {
      console.error("Error in undoTransactionMatch:", error);
      throw error;
    }
  }
}