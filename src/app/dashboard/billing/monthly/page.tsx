import MonthlyBills from '@/components/Billing/MonthlyBills'
import React from 'react'
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
const MonthlyBillsPage = () => {
  return (
    <>
    <ToastContainer /> 
      <MonthlyBills/>
    </>
  )
}

export default MonthlyBillsPage