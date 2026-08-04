import { Navigate } from "react-router-dom";
import { useAuthStore } from "@/store";

interface Props {
  children: React.ReactNode;
  requiredRole?: string[];
}

export default function ProtectedRoute({ children, requiredRole }: Props) {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (requiredRole && user && !requiredRole.includes(user.role)) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}
