import { supabase } from "@/utils/supabase/browserClient";

export interface CustomerBalance {
  customer_id: string;
  total_billed: number;
  total_paid: number;
  overdue: number;
  due_balance: number;
  wallet: number;
  last_updated: Date;
}

export class CustomerBalanceService {
  // Get or create customer balance record
  private async getOrCreateCustomerBalance(customer_id: string): Promise<CustomerBalance> {
    const { data, error } = await supabase
      .from("customer_balances")
      .select("*")
      .eq("customer_id", customer_id)
      .single();

    if (error || !data) {
      // Create new balance record if none exists
      const newBalance: CustomerBalance = {
        customer_id,
        total_billed: 0,
        total_paid: 0,
        overdue: 0,
        due_balance: 0,
        wallet: 0,
        last_updated: new Date()
      };

      const { error: insertError } = await supabase
        .from("customer_balances")
        .insert(newBalance);

      if (insertError) throw insertError;
      return newBalance;
    }

    return data as CustomerBalance;
  }

  // Recalculate customer balance from all bills and payments
  async recalculateCustomerBalance(customer_id: string): Promise<CustomerBalance> {
    // Get all bills for the customer
    const { data: bills, error: billsError } = await supabase
      .from("monthly_bills")
      .select("*")
      .eq("customer_id", customer_id)
      .order("billing_period_start", { ascending: true });

    if (billsError) throw billsError;

    // Get all payments for the customer
    const { data: payments, error: paymentsError } = await supabase
      .from("transactions")
      .select("*")
      .eq("customer_id", customer_id)
      .in("status", ["Matched", "Partially Matched"]);

    if (paymentsError) throw paymentsError;

    // Calculate totals
    // Use total_bill (which includes revenue + arrears + interest) instead of just total_revenue
    const total_billed = bills?.reduce((sum, bill) => sum + (bill.total_bill || bill.total_revenue || 0), 0) || 0;
    const total_paid = payments?.reduce((sum, payment) => sum + (payment.paid_amount || 0), 0) || 0;

    // Calculate overdue: Get the last_overdue from the most recent bill
    // This represents unpaid amounts from previous billing periods
    const overdue = bills && bills.length > 0
      ? (bills[bills.length - 1].last_overdue || 0)
      : 0;

    // Calculate due_balance and wallet
    // due_balance = what customer owes (total_billed - total_paid, but only if positive)
    // wallet = credit balance when payment exceeds what's owed
    const balance_difference = total_billed - total_paid;
    const due_balance = balance_difference > 0 ? parseFloat(balance_difference.toFixed(2)) : 0;
    const wallet = balance_difference < 0 ? parseFloat(Math.abs(balance_difference).toFixed(2)) : 0;

    // Update customer balance record
    const { error: updateError } = await supabase
      .from("customer_balances")
      .upsert({
        customer_id: customer_id,
        total_billed: total_billed,
        total_paid: total_paid,
        overdue: overdue,
        due_balance: due_balance,
        wallet: wallet,
        last_updated: new Date()
      });

    if (updateError) throw updateError;

    return {
      customer_id,
      total_billed,
      total_paid,
      overdue,
      due_balance,
      wallet,
      last_updated: new Date()
    };
  }

// Update customer balance when a new bill is generated
// The overdue amount should be passed from the billing service (last_overdue from the bill)
async addNewBill(customer_id: string, billAmount: number, overdueAmount: number = 0): Promise<void> {
    const balance = await this.getOrCreateCustomerBalance(customer_id);

    const newTotalBilled = balance.total_billed + billAmount;

    // Overdue is passed from the billing generation logic
    // It represents the unpaid balance from previous billing periods
    const newOverdue = overdueAmount;

    // Calculate due_balance: total_billed - total_paid (only if positive)
    // Wallet remains unchanged when adding a bill (it only changes with payments)
    const balance_difference = newTotalBilled - balance.total_paid;
    const newDueBalance = balance_difference > 0 ? parseFloat(balance_difference.toFixed(2)) : 0;
    const newWallet = balance_difference < 0 ? parseFloat(Math.abs(balance_difference).toFixed(2)) : 0;

    const { error } = await supabase
      .from("customer_balances")
      .update({
        total_billed: newTotalBilled,
        overdue: newOverdue,
        due_balance: newDueBalance,
        wallet: newWallet,
        last_updated: new Date()
      })
      .eq("customer_id", customer_id);

    if (error) throw error;
  }
  

  // Update customer balance when a payment is processed
  async processPayment(customer_id: string, paymentAmount: number): Promise<void> {
    const balance = await this.getOrCreateCustomerBalance(customer_id);

    const newTotalPaid = balance.total_paid + paymentAmount;

    // Calculate the new balance difference
    const balance_difference = balance.total_billed - newTotalPaid;

    // Calculate overdue after payment
    // If payment fully covers the balance, overdue becomes 0
    let newOverdue = balance.overdue;
    if (balance_difference <= 0) {
      // Payment covers everything, clear overdue
      newOverdue = 0;
    }

    // Calculate due_balance and wallet
    // due_balance = what customer still owes (total_billed - total_paid, only if positive)
    // wallet = credit when payment exceeds total_billed
    const newDueBalance = balance_difference > 0 ? parseFloat(balance_difference.toFixed(2)) : 0;
    const newWallet = balance_difference < 0 ? parseFloat(Math.abs(balance_difference).toFixed(2)) : 0;

    const { error } = await supabase
      .from("customer_balances")
      .update({
        total_paid: newTotalPaid,
        overdue: newOverdue,
        due_balance: newDueBalance,
        wallet: newWallet,
        last_updated: new Date()
      })
      .eq("customer_id", customer_id);

    if (error) throw error;
  }

  // Get current balance for a customer (returns due_balance)
  async getCustomerBalance(customerId: string) {
    const { data, error } = await supabase
      .from("customer_balances")
      .select("due_balance")
      .eq("customer_id", customerId)
      .single(); // Assumes one record per customer

    if (error) {
      throw error;
    }

    // Extract due_balance and ensure it's a number
    const dueBalance = data?.due_balance ?? 0; // Default to 0 if not found
    return dueBalance; // Return as a number
  }


}