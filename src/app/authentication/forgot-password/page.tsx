import React from "react";
import ForgotPassword from "@/components/Auth/ForgotPassword";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Forgot Password - Greenlight Solar",
  description: "Reset your password for Greenlight Solar admin portal",
};

const ForgotPasswordPage: React.FC = () => {
  return (
    <div className="flex h-screen items-center justify-center">
      <ForgotPassword />
    </div>
  );
};

export default ForgotPasswordPage;
