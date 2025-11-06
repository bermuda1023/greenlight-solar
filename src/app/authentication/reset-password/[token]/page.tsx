import React from "react";
import ResetPassword from "@/components/Auth/ResetPassword";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Reset Password - Greenlight Solar",
  description: "Reset your password for Greenlight Solar admin portal",
};

interface ResetPasswordPageProps {
  params: {
    token: string;
  };
}

const ResetPasswordPage: React.FC<ResetPasswordPageProps> = ({ params }) => {
  return (
    <div className="flex h-screen items-center justify-center">
      <ResetPassword token={params.token} />
    </div>
  );
};

export default ResetPasswordPage;
