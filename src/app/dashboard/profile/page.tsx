import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";
import { Metadata } from "next";
import DefaultLayout from "@/components/Layouts/DefaultLaout";
import ProfileBox from "@/components/ProfileBox";

export const metadata: Metadata = {
  title: "Profile",
};

const Profile = () => {
  return (
    <>
      <div className="mx-auto w-full max-w-[970px]">
        <Breadcrumb pageName="Profile" />

        <ProfileBox />
      </div>
    </>
  );
};

export default Profile;
