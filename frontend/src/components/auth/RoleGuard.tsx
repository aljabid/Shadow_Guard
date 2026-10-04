import { useAuthStore } from "@/store";

interface Props { roles: string[]; children: React.ReactNode; fallback?: React.ReactNode; }

export default function RoleGuard({ roles, children, fallback = null }: Props) {
  const { user } = useAuthStore();
  if (!user || !roles.includes(user.role)) return <>{fallback}</>;
  return <>{children}</>;
}
