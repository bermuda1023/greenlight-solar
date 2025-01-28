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
