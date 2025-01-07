// app/layout.tsx
import { Metadata } from 'next';
import { defaultMetadata } from '@/types/metadata-config';
import "jsvectormap/dist/css/jsvectormap.css";
import "flatpickr/dist/flatpickr.min.css";
import "@/css/satoshi.css";
import "@/css/style.css";
import 'flowbite';
import RootLayoutClient from './RootLayoutClient';
import { AuthProvider } from '@/context/AuthContext';

// Export metadata configuration
export const metadata: Metadata = defaultMetadata;

// Root Layout (Server Component)
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <RootLayoutClient><AuthProvider>{children}</AuthProvider></RootLayoutClient>
    </html>
  );
}