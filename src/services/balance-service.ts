import { supabase } from "@/utils/supabase/browserClient";

export interface CustomerBalance {
  customer_id: string;
  total_billed: number;
  total_paid: number;
  current_balance: number;
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
        current_balance: 0,
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
    const current_balance = total_billed - total_paid;

    // Update customer balance record
    const { error: updateError } = await supabase
      .from("customer_balances")
      .upsert({
        customer_id: customer_id,
        total_billed: total_billed,
        total_paid: total_paid,
        current_balance: current_balance,
        last_updated: new Date()
      });

    if (updateError) throw updateError;

    return {
      customer_id,
      total_billed,
      total_paid,
      current_balance,
      last_updated: new Date()
    };
  }

// Update customer balance when a new bill is generated
async addNewBill(customer_id: string, billAmount: number): Promise<void> {
    const balance = await this.getOrCreateCustomerBalance(customer_id);
    
    const { error } = await supabase
      .from("customer_balances")
      .update({
        total_billed: balance.total_billed + billAmount,
        current_balance: balance.current_balance + billAmount,
        last_updated: new Date()
      })
      .eq("customer_id", customer_id);
  
    if (error) throw error;
  }
  

  // Update customer balance when a payment is processed
  async processPayment(customer_id: string, paymentAmount: number): Promise<void> {
    const balance = await this.getOrCreateCustomerBalance(customer_id);
    
    const { error } = await supabase
      .from("customer_balances")
      .update({
        total_paid: balance.total_paid + paymentAmount,
        current_balance: balance.current_balance - paymentAmount,
        last_updated: new Date()
      })
      .eq("customer_id", customer_id);

    if (error) throw error;
  }

  // // Get current balance for a customer
  // async getCustomerBalance(customer_id: string): Promise<number> {
  //   const balance = await this.getOrCreateCustomerBalance(customer_id);
  //   return balance.current_balance;
  // }
// old service
async getCustomerBalance(customerId: string) {
  const { data, error } = await supabase
    .from("customer_balances")
    .select("current_balance")
    .eq("customer_id", customerId)
    .single(); // Assumes one record per customer

  if (error) {
    throw error;
  }

  // Extract current_balance and ensure it's a number
  const currentBalance = data?.current_balance ?? 0; // Default to 0 if not found
  return currentBalance; // Return as a number
}


}