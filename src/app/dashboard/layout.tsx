import DefaultLayout from "@/components/Layouts/DefaultLaout";
import ProtectedRoute from "./ProtectedRoute";
import { AuthProvider } from "@/context/AuthContext";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <DefaultLayout>
        <ProtectedRoute>{children}</ProtectedRoute>
      </DefaultLayout>
    </AuthProvider>
  );
}
