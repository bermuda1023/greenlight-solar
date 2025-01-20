import { Metadata } from "next";

import BillParams from "@/components/SettingBoxes/billparams";

export const metadata: Metadata = {
  title: "Bill Parameters",
};

const BillParameters = () => {
  return (
    <div className="mx-auto w-full ">
      {/* <Breadcrumb pageName="Settings" /> */}

      <BillParams />
    </div>
  );
};

export default BillParameters;
