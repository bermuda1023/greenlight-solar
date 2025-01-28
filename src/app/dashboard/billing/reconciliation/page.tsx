import Reconciliation from "@/components/Billing/Reconciliation";
import React from "react";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const ReconciliationPage = () => {
  return (
    <>
    <ToastContainer/>
      <Reconciliation />
    </>
  );
};

export default ReconciliationPage;
