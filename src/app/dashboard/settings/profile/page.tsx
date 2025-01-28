import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";

import { Metadata } from "next";
import SettingBoxes from "@/components/SettingBoxes";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export const metadata: Metadata = {
  title: "Settings",
};

const Settings = () => {
  return (
    <div className="mx-auto w-full">
      {/* <Breadcrumb pageName="Settings" /> */}
      <ToastContainer />
      <SettingBoxes />
    </div>
  );
};

export default Settings;
