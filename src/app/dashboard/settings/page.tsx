import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";

import { Metadata } from "next";
import DefaultLayout from "@/components/Layouts/DefaultLaout";
import SettingBoxes from "@/components/SettingBoxes";

export const metadata: Metadata = {
  title: "Settings",
};

const Settings = () => {
  return (
    <div className="mx-auto w-full max-w-[1080px]">
      {/* <Breadcrumb pageName="Settings" /> */}

      <SettingBoxes />
    </div>
  );
};

export default Settings;
