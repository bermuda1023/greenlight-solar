import React, { useCallback, useEffect, useRef, useState } from "react";
import html2pdf from "html2pdf.js";
import Image from "next/image";
import { supabase } from "@/utils/supabase/browserClient";

interface Bill {
  id: string;
  site_name: string;
  email: string;
  address: string;
  billing_period_start: string;
  billing_period_end: string;
  production_kwh: number;
  self_consumption_kwh: number;
  export_kwh: number;
  total_cost: number;
  total_PTS: number;
  energy_rate: number;
  total_revenue: number;
  status: string;
  created_at: string;
  arrears: number;
  invoice_number: string;
  customer_id:string;
}

interface CustomerBalanceProp {
  customer_id:string;
    total_billed:number;
  total_paid:number;
  current_balance:number;  
  }
  interface Parameters {
    id: string;
    fuelRate: number;
    feedInPrice: number;
    basePrice: number;
    message: string;
  }

const ViewBillModal: React.FC<{ closeModal: () => void; bill: Bill }> = ({
  closeModal,
  bill,
}) => {
  const invoiceRef = useRef<HTMLDivElement>(null);
  const [parameters, setParameters] = useState<Parameters[]>([]);
  const [customerBalance, setCustomerBalance] = useState<CustomerBalanceProp | null>(null);
  

  const [error, setError] = useState<string | null>(null);

  const fetchParameters = useCallback(async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from("parameters")
        .select("*");
      if (fetchError) throw fetchError;
      console.log("Fetched parameters:", data); // Check what data is being fetched
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
        .in("customer_id", [bill.customer_id]);
  
      if (fetchError) throw fetchError;
  
      setCustomerBalance(data?.[0] || null); // Store as a single object
      console.log(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error fetching parameters"
      );
    }
  }, [bill.customer_id]);
  
  // Accessing safely
  console.log(customerBalance?.current_balance);
  

  useEffect(() => {
    fetchCustomerBalance();
    fetchParameters();
  }, [fetchParameters]);
  const generatePDF = async () => {
    if (invoiceRef.current) {
      const options = {
        margin: [-1, -1, -1, -1], // Top, Left, Bottom, Right margins in mm
        filename: `Invoice-${bill.id}.pdf`,
        html2canvas: {
          scale: 3,
          logging: true,
        },
        jsPDF: {
          unit: "mm",
          format: "a4",
          orientation: "portrait",
        },
      };

      const abcd = await html2pdf()
        .from(invoiceRef.current)
        .set(options)
        .save();

      console.log(abcd);
    }
  };

  // Calculate totals
  const overdueBalance =customerBalance?.current_balance  || 0;
  const balanceDue = bill.total_revenue + overdueBalance;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-gray-600 bg-opacity-50"
      onClick={closeModal}
    >
      <div
        className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-lg bg-white p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Invoice Content main Div */}
        <div
          ref={invoiceRef}
          className="mx-auto h-[297mm] w-full max-w-[210mm] border border-gray-300 bg-white px-8 pb-12 shadow-lg"
        >
          <header className="mt-6 flex items-center justify-between py-16">
            <Image
              src="/images/logo/logo.svg" // Ensure this file exists in the "public/images/logo" folder
              alt="Logo"
              width={360}
              height={60}
              priority // Ensures the logo is loaded as soon as possible, optimizing LCP
              className="max-w-full"
            />
          </header>

          <section className="mb-26 mt-9">
            <div className="flex items-center justify-between pb-2">
              <h2 className="text-md text-black">RECIPIENT</h2>
              <div className="pr-3 text-2xl font-semibold text-black">
                INVOICE
              </div>
            </div>

            <table className="mt-4 w-full text-left text-gray-600">
              <tbody>
                <tr>
                  <td className="pr-4 text-sm font-semibold text-black">
                    Name:
                  </td>
                  <td className="text-xs">{bill.site_name}</td>
                  <td className="pr-4 text-sm font-semibold text-black">
                    Email:
                  </td>
                  <td className="text-xs">{bill.email}</td>
                  <td className="pr-4 text-sm font-semibold text-black">
                    Date:
                  </td>
                  <td className="text-xs">
                    {new Date(bill.created_at).toLocaleDateString()}
                  </td>
                </tr>
                <tr>
                  <td className="pr-4 text-sm font-semibold text-black">
                    Address:
                  </td>
                  <td className="text-xs">{bill.address || "N/A"}</td>
                  <td className="pr-4 text-sm font-semibold text-black">
                    Invoice Number:
                  </td>
                  <td className="text-xs">{bill.invoice_number}</td>
                  <td></td>
                  <td></td>
                </tr>
              </tbody>
            </table>
          </section>

          <table className="mb-20 w-full text-left text-sm">
            <thead className="border-b-2 border-green-300 text-gray-700 ">
              <tr>
                <th className="p-3  text-sm">Period Start</th>
                <th className="p-3  text-sm">Period End</th>
                <th className="p-3  text-sm">Description</th>
                <th className="p-3  text-sm">Energy PTS</th>
                <th className="p-3  text-sm">Per Unit</th>
                <th className="p-3 text-sm">Total</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="p-3 text-xs text-gray-600">
                  {bill.billing_period_start}
                </td>
                <td className="p-3 text-xs text-gray-600">
                  {bill.billing_period_end}
                </td>
                <td className="p-3 text-xs text-gray-600">Energy Produced</td>
                <td className="p-3 text-xs text-gray-600">{bill.total_PTS}</td>
                <td className="p-3 text-xs text-gray-600">
                  ${bill.energy_rate.toFixed(4)}
                </td>
                <td className="p-3 text-xs text-gray-600">
                  ${bill.total_revenue.toFixed(2)}
                </td>
              </tr>
            </tbody>
          </table>

          <section className="mb-6 space-y-6 text-right">
            <div className="flex w-full justify-end  text-sm font-semibold text-gray-800">
              <p className=" "> TOTAL PERIOD BALANCE{" "}</p>
              <span className="ml-20 w-16 text-black">
                ${bill.total_revenue.toFixed(2)}
              </span>
            </div>
            <div className="flex w-full justify-end  text-sm font-semibold text-gray-800">
              <p className=""> OVERDUE BALANCE{" "}</p>
              <span className="ml-20 w-16 text-black">
                ${overdueBalance.toFixed(2)}
              </span>
            </div>


            <div className="flex w-full justify-end  text-sm font-semibold text-red-600">
              <p className=" "> BALANCE DUE{" "}</p>
              <span className="ml-20 w-16 ">
                ${balanceDue.toFixed(2)}
              </span>
            </div>
    
          </section>

          <section className="mt-12 text-sm text-gray-700">
            <h3 className="mb-4 w-1/2 border-b-2 border-green-300 p-4 font-semibold text-black">
              DIRECT DEPOSIT
            </h3>
            <p className="text-sm">
              Bank Name:{" "}
              <span className="text-xs font-semibold">Bank of Butterfield</span>
            </p>
            <p className="text-sm">
              Account Name:{" "}
              <span className="text-xs font-semibold">
                GreenLight Financing Ltd.{" "}
              </span>
            </p>
            <p className="text-sm">
              Account Number:{" "}
              <span className="text-xs font-semibold">060400 6770 014</span>
            </p>
          </section>

          <footer className="mt-24 grid grid-cols-3 gap-12 text-gray-800">
            <div className="col-span-1">
              <p className="text-center text-sm">
                {parameters.length > 0
                  ? parameters[0].message // Use the message from the first parameter
                  : "Thank you for doing business with us!"}{" "}
                {/* Fallback if no parameters */}
              </p>
            </div>
            <div className="col-span-1 text-xs ">
              <p>
                Greenlight Financing Ltd. #48 Par-la-ville Road, Suite 1543,
                Hamilton, HM11
              </p>
            </div>
            <div className="col-span-1 text-xs">
              <a
                href="mailto:billing@greenlightenergy.bm"
                className="text-blue-700 underline"
              >
                billing@greenlightenergy.bm Phone: 1 (441) 705 3033
              </a>
            </div>
          </footer>
        </div>

        {/* Buttons */}
        <div className="flex gap-2">
          <button
            onClick={closeModal}
            className="mt-4 w-full rounded-lg bg-gray-200 text-dark-2 hover:text-red-700"
          >
            Close
          </button>
          <button
            onClick={generatePDF}
            className="mt-4 w-full rounded-lg bg-primary py-2 text-white hover:bg-green-500"
          >
            Download PDF
          </button>
        </div>
      </div>
    </div>
  );
};

export default ViewBillModal;
