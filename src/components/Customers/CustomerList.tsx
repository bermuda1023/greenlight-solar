import React from 'react'
import CustomersListTable from '../Tables/CustomersListTable'
import { ToastContainer } from 'react-toastify'
import "react-toastify/dist/ReactToastify.css";



const CustomerList = () => {
  return (
    <>
    <ToastContainer/>
    <CustomersListTable/>
    </>
  )
}

export default CustomerList