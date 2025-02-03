import { Metadata } from "next";

import BillParams from "@/components/SettingBoxes/billparams";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export const metadata: Metadata = {
  title: "Bill Parameters",
};

const BillParameters = () => {
  return (
    <div className="mx-auto w-full ">
      {/* <Breadcrumb pageName="Settings" /> */}
      <ToastContainer />

      <BillParams />
    </div>
  );
};

export default BillParameters;
