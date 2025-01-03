import { Metadata } from 'next';

export const defaultMetadata: Metadata = {
  title: {
    template: '%s | Greenlight Energy Solar Management & Billing System',
    default: 'Greenlight Energy | Solar Management & Billing System'
  },
  description:
    "Greenlight Energy's platform streamlines customer management, solar panel installations, electricity usage tracking, billing, and reconciliation processes.",
  keywords: [
    "Greenlight Energy",
    "solar management platform",
    "solar billing system",
    "customer management for solar",
    "electricity import/export tracking",
    "solar energy billing",
    "Greenlight Energy web platform",
    "monthly bill generation",
    "solar API integration",
    "solar panel installations",
    "reconcile payments",
    "electricity usage tracking",
  ],
  robots: "index, follow",
  authors: [{ name: "Greenlight Energy" }],
};

export const viewport = {
  width: 'device-width',
  initialScale: 1
};