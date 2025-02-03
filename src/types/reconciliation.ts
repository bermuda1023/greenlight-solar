// types/reconciliation.ts
export interface BillData {
    id: string;
    date: string;
    description: string;
    amount: number;
    status: "Unmatched" | "Matched" | "Partially Matched";
    paid_amount: number;
    pending_amount: number;
    bill_id?: string;
  }
  
  export interface MonthlyBill {
    id: string;
    site_name: string;
    billing_period_start: string;
    billing_period_end: string;
    total_revenue: number;
    status: string;
    arrears: number;
    paid_amount: number;
    pending_bill: number;
    total_bill: number;
    reconciliation_ids: string[];
  }
  
  export interface MatchedBill {
    billId: string;
    amount: number;
  }