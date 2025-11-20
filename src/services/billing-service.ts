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

    // Arrears and overpayment calculations are handled by the customer_balances table
    return {
      totalOutstanding: currentBalance,
      currentArrears: currentBalance > 0 ? currentBalance : 0,
      overpaymentBalance: currentBalance < 0 ? Math.abs(currentBalance) : 0
    };
  }
}