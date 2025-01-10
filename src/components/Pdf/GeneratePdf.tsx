import React from "react";
import jsPDF from "jspdf";

interface GeneratePDFProps {
  onGenerate?: () => void; // Optional callback when the PDF is generated
}

const GeneratePDF: React.FC<GeneratePDFProps> = ({ onGenerate }) => {
  const generatePDF = () => {
    const doc = new jsPDF();

    // Add content to the PDF
    doc.text("Invoice", 105, 20, { align: "center" });
    doc.setFontSize(12);
    doc.text("Customer Name: John Doe", 20, 40);
    doc.text("Date: 2025-01-09", 20, 50);
    doc.text("Amount: $150", 20, 60);

    // Add a table or details
    doc.setFontSize(10);
    doc.text("Item List", 20, 80);
    doc.text("Item 1: Product A - $50", 20, 90);
    doc.text("Item 2: Product B - $100", 20, 100);

    // Save the PDF
    doc.save("invoice.pdf");

    // Call the callback function if provided
    if (onGenerate) {
      onGenerate();
    }
  };

  return (
    <button
      onClick={generatePDF}
      className="rounded-md bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
    >
      Generate PDF
    </button>
  );
};

export default GeneratePDF;
