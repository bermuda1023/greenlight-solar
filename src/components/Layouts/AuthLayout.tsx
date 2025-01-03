"use client";
import React from "react";
import Navbar from "@/components/Navbar/Navbar";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {/* Navbar */}
      <Navbar />
        <main>
          {children}
        </main>
    </>
  );
}
