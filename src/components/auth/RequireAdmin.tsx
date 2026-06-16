import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Gate that requires the signed-in user to have the `admin` role in `user_roles`.
 * Logged-in-but-not-admin users are bounced to the studio rather than shown the
 * dashboard. (RLS on the DB is the real backstop; this is defense-in-depth + UX.)
 *
 * Note: to grant access, a row {user_id, role:'admin'} must exist in `user_roles`.
 */
const RequireAdmin: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, isLoading: roleLoading } = useUserRole();
  const location = useLocation();

  if (authLoading || (user && roleLoading)) {
    return (
      <div className="container mx-auto p-6">
        <div className="space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-40 w-full" />
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default RequireAdmin;
