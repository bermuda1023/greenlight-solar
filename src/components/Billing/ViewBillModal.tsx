import React, { useCallback, useEffect, useState } from "react";
import jsPDF from "jspdf";
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
  total_production?: number; // New field
  effective_rate?: number; // New field
  total_revenue: number;
  created_at: string;
  invoice_number: string;
  customer_id: string;
  interest?: number;
  last_overdue?: number; // Overdue balance at time of bill generation
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
  const [parameters, setParameters] = useState<Parameters[]>([]);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log("Bill Data From Model", bill);
  }, [bill]);

  const fetchParameters = useCallback(async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from("parameters")
        .select("*");
      if (fetchError) throw fetchError;
      console.log("Fetched parameters:", data);
      setParameters(data || []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error fetching parameters",
      );
    }
  }, []);

  useEffect(() => {
    fetchParameters();
  }, [fetchParameters]);

  // Calculate totals - use last_overdue from the bill instead of fetching customer_balances
  const overdueBalance = bill.last_overdue || 0;
  const interestAmount = bill.interest || 0;
  const balanceDue = (bill.total_revenue || 0) + overdueBalance + interestAmount;

  const effectiveRate = bill.effective_rate
    ? bill.effective_rate.toFixed(3)
    : (bill.total_revenue > 0 && bill.total_production && bill.total_production > 0
      ? (bill.total_revenue / bill.total_production).toFixed(3)
      : "0.000");

  const productionValue = bill.total_production ?? 0;

  const generatePDFDocument = useCallback(() => {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    // Set font
    doc.setFont("helvetica");

    // Add Logo/Header
    doc.setFontSize(24);
    doc.setTextColor(34, 197, 94); // Green color
    doc.text("Greenlight", 20, 25);
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text("Solar Energy Solutions", 20, 31);

    // Invoice Title
    doc.setFontSize(20);
    doc.setTextColor(0, 0, 0);
    doc.text("INVOICE", 20, 50);

    // Customer Information
    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);

    // Left column
    doc.setFont("helvetica", "bold");
    doc.text("Name:", 20, 65);
    doc.setFont("helvetica", "normal");
    doc.text(String(bill.site_name || "N/A"), 45, 65);

    doc.setFont("helvetica", "bold");
    doc.text("Address:", 20, 72);
    doc.setFont("helvetica", "normal");
    doc.text(String(bill.address || "N/A"), 45, 72);

    // Right column
    doc.setFont("helvetica", "bold");
    doc.text("Email:", 110, 65);
    doc.setFont("helvetica", "normal");
    doc.text(String(bill.email || "N/A"), 130, 65);

    doc.setFont("helvetica", "bold");
    doc.text("Date:", 110, 72);
    doc.setFont("helvetica", "normal");
    doc.text(String(new Date(bill.created_at).toLocaleDateString()), 130, 72);

    doc.setFont("helvetica", "bold");
    doc.text("Invoice Number:", 110, 79);
    doc.setFont("helvetica", "normal");
    doc.text(String(bill.invoice_number || "N/A"), 150, 79);

    doc.setFont("helvetica", "bold");
    doc.text("Effective Rate:", 110, 86);
    doc.setFont("helvetica", "normal");
    doc.text(String(`${effectiveRate}¢`), 150, 86);

    // Billing Period Table Header
    doc.setFillColor(34, 197, 94); // Green
    doc.rect(20, 95, 170, 8, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("Period Start", 25, 100);
    doc.text("Period End", 60, 100);
    doc.text("Production (kWh)", 95, 100);
    doc.text("Rate", 135, 100);
    doc.text("Revenue", 160, 100);

    // Billing Period Data
    doc.setTextColor(60, 60, 60);
    doc.setFont("helvetica", "normal");
    doc.text(String(bill.billing_period_start || "N/A"), 25, 108);
    doc.text(String(bill.billing_period_end || "N/A"), 60, 108);
    doc.text(String(productionValue.toFixed(2)), 95, 108);
    doc.text(String(`${effectiveRate}¢`), 135, 108);
    doc.text(String(`$${bill.total_revenue.toFixed(2)}`), 160, 108);

    // Line separator
    doc.setDrawColor(200, 200, 200);
    doc.line(20, 113, 190, 113);

    // Summary Section
    let yPos = 130;
    doc.setFont("helvetica", "bold");
    doc.text("Revenue", 130, yPos);
    doc.setFont("helvetica", "normal");
    doc.text(String(`$${bill.total_revenue.toFixed(2)}`), 190, yPos, { align: "right" });

    yPos += 7;
    doc.setFont("helvetica", "bold");
    doc.text("Balance (Overdue)", 130, yPos);
    doc.setFont("helvetica", "normal");
    doc.text(String(`$${overdueBalance.toFixed(2)}`), 190, yPos, { align: "right" });

    if (interestAmount > 0) {
      yPos += 7;
      doc.setFont("helvetica", "bold");
      doc.text("Interest", 130, yPos);
      doc.setFont("helvetica", "normal");
      doc.text(String(`$${interestAmount.toFixed(2)}`), 190, yPos, { align: "right" });
    }

    yPos += 10;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(220, 38, 38); // Red
    doc.text("Total Balance", 130, yPos);
    doc.text(String(`$${balanceDue.toFixed(2)}`), 190, yPos, { align: "right" });

    // Direct Deposit Section
    yPos += 20;
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "bold");
    doc.text("DIRECT DEPOSIT", 20, yPos);

    // Green underline
    doc.setDrawColor(34, 197, 94);
    doc.setLineWidth(0.5);
    doc.line(20, yPos + 1, 70, yPos + 1);

    yPos += 8;
    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    doc.setFont("helvetica", "normal");
    doc.text("Bank Name: ", 20, yPos);
    doc.setFont("helvetica", "bold");
    doc.text("Bank of Butterfield", 50, yPos);

    yPos += 6;
    doc.setFont("helvetica", "normal");
    doc.text("Account Name: ", 20, yPos);
    doc.setFont("helvetica", "bold");
    doc.text("Greenlight Financing Ltd.", 50, yPos);

    yPos += 6;
    doc.setFont("helvetica", "normal");
    doc.text("Account Number: ", 20, yPos);
    doc.setFont("helvetica", "bold");
    doc.text("060400 6770 014", 50, yPos);

    // Footer
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);

    const footerY = 270;

    // Message - ensure it's always a string and split into lines if needed
    const message = parameters.length > 0 && parameters[0]?.message
      ? String(parameters[0].message)
      : "Thank you for doing business with us!";

    // Split text into multiple lines if too long
    const messageLines = doc.splitTextToSize(message, 50);
    doc.text(messageLines, 20, footerY);

    // Address
    doc.text("Greenlight Financing Ltd.", 75, footerY);
    doc.text("11 Bermudiana Road, Suite 1543,", 75, footerY + 4);
    doc.text("Hamilton, HM08", 75, footerY + 8);

    // Contact
    doc.setTextColor(37, 99, 235); // Blue
    doc.text("billing@greenlightenergy.bm", 135, footerY);
    doc.setTextColor(100, 100, 100);
    doc.text("Phone: 1 (441) 705 3033", 135, footerY + 4);

    return doc;
  }, [bill, parameters, effectiveRate, productionValue, overdueBalance, interestAmount, balanceDue]);

  const generatePDFPreview = useCallback(() => {
    setIsGeneratingPreview(true);
    setError(null); // Clear any previous errors

    try {
      console.log("Generating PDF preview...");
      const doc = generatePDFDocument();
      const pdfBlob = doc.output("blob");
      console.log("PDF Blob generated:", pdfBlob.size, "bytes");

      const url = URL.createObjectURL(pdfBlob);
      console.log("Blob URL created:", url);

      setPdfUrl(url);
      setIsGeneratingPreview(false);
    } catch (error) {
      console.error("Error generating PDF preview:", error);
      setError(`Failed to generate PDF preview: ${error instanceof Error ? error.message : "Unknown error"}`);
      setIsGeneratingPreview(false);
    }
  }, [generatePDFDocument]);

  const downloadPDF = useCallback(() => {
    try {
      const doc = generatePDFDocument();
      doc.save(`Invoice-${bill.invoice_number || bill.id}.pdf`);
    } catch (error) {
      console.error("Error downloading PDF:", error);
      setError(`Failed to download PDF: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }, [generatePDFDocument, bill.invoice_number, bill.id]);

  // Don't auto-generate preview - let user click button instead

  // Cleanup blob URL on unmount
  useEffect(() => {
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [pdfUrl]);

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-gray-600 bg-opacity-50"
      onClick={closeModal}
    >
      <div
        className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-lg bg-white p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Invoice Preview</h2>
          <button
            onClick={closeModal}
            className="rounded-lg px-4 py-2 text-gray-600 hover:bg-gray-100"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-100 p-3 text-red-700">
            {error}
          </div>
        )}

        {isGeneratingPreview && (
          <div className="mb-4 flex items-center justify-center p-8">
            <div className="text-gray-600">Generating PDF preview...</div>
          </div>
        )}

        {/* PDF Preview using iframe */}
        {pdfUrl && !isGeneratingPreview && (
          <div className="mb-4">
            <iframe
              src={pdfUrl}
              className="h-[600px] w-full rounded-lg border border-gray-300"
              title="Invoice PDF Preview"
            />
          </div>
        )}

        {/* Show placeholder when no preview */}
        {!pdfUrl && !isGeneratingPreview && (
          <div className="mb-4 flex items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-16">
            <p className="text-gray-500">Click &quot;Generate PDF Preview&quot; to view the invoice</p>
          </div>
        )}

        {/* Only two buttons */}
        <div className="mt-4 flex gap-3">
          <button
            onClick={generatePDFPreview}
            className="flex-1 rounded-lg bg-blue-500 py-3 text-white hover:bg-blue-600 disabled:bg-gray-300"
            disabled={isGeneratingPreview}
          >
            {isGeneratingPreview ? "Generating..." : "Generate PDF Preview"}
          </button>
          <button
            onClick={downloadPDF}
            className="flex-1 rounded-lg bg-primary py-3 text-white hover:bg-green-500 disabled:bg-gray-300"
            disabled={isGeneratingPreview}
          >
            Download PDF
          </button>
        </div>
      </div>
    </div>
  );
};

export default ViewBillModal;
