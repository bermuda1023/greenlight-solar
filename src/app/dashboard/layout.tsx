import DefaultLayout from "@/components/Layouts/DefaultLaout";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DefaultLayout>{children}</DefaultLayout>;
}
