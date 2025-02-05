import { supabase } from "@/utils/supabase/browserClient";
import { CustomerBalanceService } from "./balance-service";

interface CustomerBillingStatus {
  totalOutstanding: number;
  currentArrears: number;
  overpaymentBalance: number;
}

export class BillingService {
  private customerBalanceService: CustomerBalanceService;

  constructor() {
    this.customerBalanceService = new CustomerBalanceService();
  }

  // Calculate customer's current billing status
  async calculateCustomerBillingStatus(customerId: string): Promise<CustomerBillingStatus> {
    // Get customer's current balance from the dedicated service
    const currentBalance = await this.customerBalanceService.getCustomerBalance(customerId);

    // Get all bills for the customer ordered by billing period
    const { data: bills, error: billsError } = await supabase
      .from("monthly_bills")
      .select("*")
      .eq("customer_id", customerId)
      .order("billing_period_start", { ascending: true });

    if (billsError) throw billsError;

    let currentArrears = 0;
    let overpaymentBalance = 0;

    // Process bills chronologically
    for (const bill of bills || []) {
      const billTotal = bill.total_revenue;
      const paidAmount = bill.paid_amount || 0;
      
      // Calculate remaining amount for this bill
      const remaining = billTotal - paidAmount;
      
      if (remaining > 0) {
        // If there's an unpaid amount, it becomes arrears
        currentArrears = remaining;
      } else if (remaining < 0) {
        // If there's an overpayment, add it to the overpayment balance
        overpaymentBalance += Math.abs(remaining);
      }
    }

    return {
      totalOutstanding: currentBalance,
      currentArrears,
      overpaymentBalance
    };
  }

  // Update bill amounts
  async updateBillAmounts(billId: string, transactionAmount: number, isUndo: boolean = false): Promise<void> {
    const { data: bill, error: billError } = await supabase
      .from("monthly_bills")
      .select("*, customer_id")
      .eq("id", billId)
      .single();

    if (billError) throw billError;
    if (!bill) throw new Error("Bill not found");

    // Calculate new paid amount
    const newPaidAmount = isUndo 
      ? Math.max(0, (bill.paid_amount || 0) - transactionAmount)
      : (bill.paid_amount || 0) + transactionAmount;

    // Calculate new pending amount
    const newPendingBill = Math.max(0, bill.total_revenue - newPaidAmount);

    // Update the bill
    const { error: updateError } = await supabase
      .from("monthly_bills")
      .update({
        paid_amount: newPaidAmount,
        pending_bill: newPendingBill,
        status: this.calculateBillStatus(newPaidAmount, bill.total_revenue)
      })
      .eq("id", billId);

    if (updateError) throw updateError;

    // Update customer balance
    if (bill.customer_id) {
      if (isUndo) {
        // If undoing, we need to add back to the balance
        await this.customerBalanceService.processPayment(bill.customer_id, -transactionAmount);
      } else {
        // If paying, we reduce the balance
        await this.customerBalanceService.processPayment(bill.customer_id, transactionAmount);
      }
    }
  }

  private calculateBillStatus(paidAmount: number, totalAmount: number): string {
    if (paidAmount >= totalAmount) return "Paid";
    if (paidAmount > 0) return "Partially Paid";
    return "Pending";
  }
}