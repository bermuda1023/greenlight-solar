import ECommerce from "@/components/Dashboard/E-commerce";
import { Metadata } from "next";
import DefaultLayout from "@/components/Layouts/DefaultLaout";
import React from "react";
import SignIn from "./authentication/signin/page";
import AuthLayout from "@/components/Layouts/AuthLayout";


export default function Home() {
  return (
    <>
      <AuthLayout>
        <SignIn />
      </AuthLayout>
    </>
  );
}
