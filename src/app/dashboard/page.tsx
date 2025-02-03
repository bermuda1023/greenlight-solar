import ECommerce from "@/components/Dashboard/E-commerce";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: 'Dashboard',
};

export default function Home() {
  return (
    <>
      <ECommerce />
    </>
  );
}
