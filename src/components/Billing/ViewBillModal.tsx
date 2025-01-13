import React, { useRef } from 'react';
import html2pdf from 'html2pdf.js';

const ViewBillModal: React.FC<{ closeModal: () => void }> = ({ closeModal }) => {
  const invoiceRef = useRef<HTMLDivElement>(null);

  const generatePDF = () => {
    if (invoiceRef.current) {
      const options = {
        margin: [-1,-1,-1,-1],  // Top, Left, Bottom, Right margins in mm
        filename: 'invoice.pdf',
        html2canvas: {
          scale: 3,  // Increase scale for better resolution
          logging: true,  // Enable logging for debugging styles
        },
        jsPDF: {
          unit: 'mm',
          format: 'a4',
          orientation: 'portrait',
        },
      };
      
      html2pdf()
        .from(invoiceRef.current)
        .set(options)
        .save();
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex justify-center items-center z-[9999]">
      <div className="bg-white p-6 rounded-lg shadow-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto overflow-x-hidden">
        {/* Close Button */}
        <button
  onClick={closeModal}
  className="text-red-500 hover:text-red-700 text-xl mb-4 block ml-auto"
  aria-label="Close"
>
  &times;  
</button>


        {/* Invoice Content */}
        <div
          ref={invoiceRef}
          className="px-12 pb-12 mx-auto bg-white border border-gray-300 shadow-lg w-full max-w-[210mm] h-[297mm]"
          style={{
            fontFamily: 'Arial, sans-serif',
            padding: '12mm',
          }}
        >

         
          <header className="flex justify-between items-center py-16">
            <img
              src="/images/logo/logo.svg"
              alt="Logo"
              width={360}
              height={60}
              className="max-w-full"
            />
          </header>

          <section className="mb-32">
            <div className="flex justify-between items-center pb-2">
              <h2 className="text-md text-black">RECIPIENT</h2>
              <div className="text-2xl font-semibold text-black pr-3">INVOICE</div>
            </div>

            <table className="mt-4 text-gray-600 w-full text-left">
              <tbody>
                <tr>
                  <td className="font-semibold text-black pr-4 text-sm">Name:</td>
                  <td className="text-xs">Boyd Vallis</td>
                  <td className="font-semibold text-black pr-4 text-sm">Phone Number:</td>
                  <td className="text-xs">(+1) 123-456-7890</td>
                  <td className="font-semibold text-black pr-4 text-sm">Date:</td>
                  <td className="text-xs">03-01-25</td>
                </tr>
                <tr>
                  <td className="font-semibold text-black pr-4 text-sm">Address:</td>
                  <td className="text-xs">Error</td>
                  <td className="font-semibold text-black pr-4 text-sm">Email:</td>
                  <td className="text-xs">zakihasan555@gmail.com</td>
                  <td></td>
                  <td></td>
                </tr>
              </tbody>
            </table>
          </section>




          <table className="w-full mb-18 text-left text-sm">
            <thead className="text-gray-700 border-b-2 border-green-300">
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
                <td className="p-3 text-gray-600">16-12-25</td>
                <td className="p-3 text-gray-600">15-01-25</td>
                <td className="p-3 text-gray-600">Energy Produced</td>
                <td className="p-3 text-gray-600">0</td>
                <td className="p-3 text-gray-600">$0.0000</td>
                <td className="p-3 text-gray-600">$0.00</td>
              </tr>
            </tbody>
          </table>

          <section className="mb-6 text-right space-y-4">
            <p className="text-sm font-semibold text-gray-800">
              TOTAL PERIOD BALANCE <span className="text-black ml-20">$0.00</span>
            </p>
            <p className="text-sm font-bold text-black">
              OVERDUE BALANCE <span className=" ml-20">$443.26</span>
            </p>
            <p className="text-sm font-bold text-red-600">
              BALANCE DUE <span className=" ml-20">$443.26</span>
            </p>
          </section>

          <section className="mt-8 text-gray-700 text-sm">
            <h3 className="font-semibold text-black mb-4 border-b-2 p-2 border-green-300 w-1/2">
              DIRECT DEPOSIT
            </h3>
            <p>Bank Name: <span className="font-semibold">Bank of Butterfield</span></p>
            <p>Account Name: <span className="font-semibold"></span></p>
            <p>Account Number: <span className="font-semibold">060400 6770 014</span></p>
          </section>

          <footer className="mt-30 text-gray-800 grid grid-cols-3 gap-12">
            <div className="col-span-1">
              <p className=" text-xl text-center">Thank you for doing business with us!</p>
            </div>
            <div className="text-sm col-span-1 ">
              <p>Greenlight Financing Ltd. #48 Par-la-ville Road, Suite 1543, Hamilton, HM11</p>
            </div>
            <div className=" text-sm col-span-1">
              <a className="underline text-blue-700">billing@greenlightenergy.bm  Phone: 1 (441) 705 3033</a>
            </div>
          </footer>
        </div>

        {/* Button to generate PDF */}
        <button
          onClick={generatePDF}
          className="w-full mt-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-700"
        >
          Download PDF
        </button>
      </div>
    </div>
  );
};

export default ViewBillModal;



