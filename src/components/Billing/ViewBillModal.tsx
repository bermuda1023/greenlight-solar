import React, { useRef } from "react";
import html2pdf from "html2pdf.js";
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
  energy_rate: number;
  total_revenue: number;
  savings: number;
  status: string;
  created_at: string;
}

const ViewBillModal: React.FC<{ closeModal: () => void; bill: Bill }> = ({
  closeModal,
  bill,
}) => {
  const invoiceRef = useRef<HTMLDivElement>(null);

  const generatePDF = () => {
    if (invoiceRef.current) {
      const options = {
        margin: [-1, -1, -1, -1], // Top, Left, Bottom, Right margins in mm
        filename: "invoice.pdf",
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

      html2pdf().from(invoiceRef.current).set(options).save();
    }
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-gray-600 bg-opacity-50"
      onClick={closeModal}
    >
      <div
        className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-lg bg-white p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Invoice Content */}
        <div
          ref={invoiceRef}
          className="mx-auto h-[297mm] w-full max-w-[210mm] border border-gray-300 bg-white px-12 pb-12 shadow-lg"
        >
          <header className="flex items-center justify-between py-16">
            <img
              src="/images/logo/logo.svg"
              alt="Logo"
              width={360}
              height={60}
              className="max-w-full"
            />
          </header>

          <section className="mb-32">
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
                    Phone Number:
                  </td>
                  <td className="text-xs">123-456-7890</td>
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
                  <td className="text-xs">{bill.email}</td>
                  <td className="pr-4 text-sm font-semibold text-black">
                    Email:
                  </td>
                  <td className="text-xs">{bill.email}</td>
                  <td></td>
                  <td></td>
                </tr>
              </tbody>
            </table>
          </section>

          <table className="mb-18 w-full text-left text-sm">
            <thead className="border-b-2 border-green-300 text-gray-700">
              <tr>
                <th className="p-3">Period Start</th>
                <th className="p-3">Period End</th>
                <th className="p-3 ">Description</th>
                <th className="p-3">Energy PTS</th>
                <th className="p-3">Per Unit</th>
                <th className="p-3">Total</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="p-3 text-gray-600">
                  {bill.billing_period_start}
                </td>
                <td className="p-3 text-gray-600">{bill.billing_period_end}</td>
                <td className="p-3 text-gray-600">
                  Description Not Availble for now
                </td>
                <td className="p-3 text-gray-600">{bill.export_kwh}</td>
                <td className="p-3 text-gray-600">{bill.energy_rate}</td>
                <td className="p-3 text-gray-600">{bill.total_revenue}</td>
              </tr>
            </tbody>
          </table>

          <section className="mb-6 space-y-4 text-right">
            <p className="text-sm font-semibold text-gray-800">
              TOTAL PERIOD BALANCE{" "}
              <span className="ml-20 text-black">$0.00</span>
            </p>
            <p className="text-sm font-bold text-black">
              OVERDUE BALANCE <span className=" ml-20">$443.26</span>
            </p>
            <p className="text-sm font-bold text-red-600">
              BALANCE DUE <span className=" ml-20">$443.26</span>
            </p>
          </section>

          <section className="mt-8 text-sm text-gray-700">
            <h3 className="mb-4 w-1/2 border-b-2 border-green-300 p-2 font-semibold text-black">
              DIRECT DEPOSIT
            </h3>
            <p>
              Bank Name:{" "}
              <span className="font-semibold">Bank of Butterfield</span>
            </p>
            <p>
              Account Name: <span className="font-semibold"></span>
            </p>
            <p>
              Account Number:{" "}
              <span className="font-semibold">060400 6770 014</span>
            </p>
          </section>

          <footer className="mt-30 grid grid-cols-3 gap-12 text-gray-800">
            <div className="col-span-1">
              <p className=" text-center text-xl">
                Thank you for doing business with us!
              </p>
            </div>
            <div className="col-span-1 text-sm ">
              <p>
                Greenlight Financing Ltd. #48 Par-la-ville Road, Suite 1543,
                Hamilton, HM11
              </p>
            </div>
            <div className=" col-span-1 text-sm">
              <a className="text-blue-700 underline">
                billing@greenlightenergy.bm Phone: 1 (441) 705 3033
              </a>
            </div>
          </footer>
        </div>

        {/* Button to generate PDF */}
        <div className="flex gap-2">
          <button
            onClick={closeModal}
            className="mt-4 w-full rounded-lg bg-gray-200 text-dark-2 hover:text-red-700"
            aria-label="Close"
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
