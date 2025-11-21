import { supabase } from "@/utils/supabase/browserClient";

export class ReconciliationService {
  constructor() {}

  /**
   * Match a transaction to a customer
   * Updates customer balance and sets customer_id on transaction
   */
  async matchTransactionToCustomer(transactionId: string, customerId: string) {
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

      // Get current customer balance
      const { data: customerBalance, error: balanceError } = await supabase
        .from("customer_balances")
        .select("*")
        .eq("customer_id", customerId)
        .single();

      if (balanceError) {
        throw new Error("Customer balance not found");
      }

      // Calculate new totals after matching payment
      const newTotalPaid = customerBalance.total_paid + transaction.amount;

      // Calculate the new balance difference
      const balance_difference = customerBalance.total_billed - newTotalPaid;

      // Calculate due_balance and wallet
      // due_balance = what customer still owes (total_billed - total_paid, only if positive)
      // wallet = credit when payment exceeds total_billed
      const newDueBalance = balance_difference > 0 ? parseFloat(balance_difference.toFixed(2)) : 0;
      const newWallet = balance_difference < 0 ? parseFloat(Math.abs(balance_difference).toFixed(2)) : 0;

      // Update customer balance
      const { error: updateBalanceError } = await supabase
        .from("customer_balances")
        .update({
          total_paid: newTotalPaid,
          due_balance: newDueBalance,
          wallet: newWallet
        })
        .eq("customer_id", customerId);

      if (updateBalanceError) {
        throw updateBalanceError;
      }

      // Update the transaction
      const { error: updateTxError } = await supabase
        .from("transactions")
        .update({
          status: "Matched",
          customer_id: customerId
        })
        .eq("id", transactionId);

      if (updateTxError) {
        throw updateTxError;
      }

      return { success: true };
    } catch (error) {
      console.error("Error in matchTransactionToCustomer:", error);
      throw error;
    }
  }

  /**
   * Undo a transaction match
   * Reverts customer balance and clears customer_id from transaction
   */
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

      if (!transaction.customer_id) {
        throw new Error("Transaction is not matched to any customer");
      }

      // Get current customer balance
      const { data: customerBalance, error: balanceError } = await supabase
        .from("customer_balances")
        .select("*")
        .eq("customer_id", transaction.customer_id)
        .single();

      if (balanceError) {
        throw new Error("Customer balance not found");
      }

      // Calculate new totals after undoing payment
      const newTotalPaid = customerBalance.total_paid - transaction.amount;

      // Calculate the new balance difference
      const balance_difference = customerBalance.total_billed - newTotalPaid;

      // Calculate due_balance and wallet
      const newDueBalance = balance_difference > 0 ? parseFloat(balance_difference.toFixed(2)) : 0;
      const newWallet = balance_difference < 0 ? parseFloat(Math.abs(balance_difference).toFixed(2)) : 0;

      // Update customer balance
      const { error: updateBalanceError } = await supabase
        .from("customer_balances")
        .update({
          total_paid: newTotalPaid,
          due_balance: newDueBalance,
          wallet: newWallet
        })
        .eq("customer_id", transaction.customer_id);

      if (updateBalanceError) {
        throw updateBalanceError;
      }

      // Reset the transaction and clear customer_id
      const { error: updateTxError } = await supabase
        .from("transactions")
        .update({
          status: "Unmatched",
          customer_id: null
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

  /**
   * Get customer balance details
   */
  async getCustomerBalance(customerId: string) {
    try {
      const { data, error } = await supabase
        .from("customer_balances")
        .select("*")
        .eq("customer_id", customerId)
        .single();

      if (error) throw error;

      return {
        total_billed: data.total_billed || 0,
        total_paid: data.total_paid || 0,
        due_balance: data.due_balance || 0,
        wallet: data.wallet || 0
      };
    } catch (error) {
      console.error("Error getting customer balance:", error);
      throw error;
    }
  }
}