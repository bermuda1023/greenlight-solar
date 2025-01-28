import AddCustomer from "@/components/Customers/AddCustomer";
import React from "react";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
const AddCustomerPage = () => {
  return (
    <>
    <ToastContainer/>
      <AddCustomer />
    </>
  );
};

export default AddCustomerPage;
