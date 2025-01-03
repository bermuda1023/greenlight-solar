// app/RootLayoutClient.tsx
'use client';
import React, { useEffect, useState } from "react";
import Loader from "@/components/common/Loader";

export default function RootLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  const [loading, setLoading] = useState<boolean>(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    setTimeout(() => setLoading(false), 1000);
  }, []);

  return (
    <body suppressHydrationWarning={true}>
      {loading ? <Loader /> : children}
    </body>
  );
}