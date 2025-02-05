import ReconciliationTest from "@/components/Billing/ReconciliationTest";
import React from "react";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const ReconciliationPage = () => {
  return (
    <>
    <ToastContainer/>
      <ReconciliationTest />
    </>
  );
};

export default ReconciliationPage;
