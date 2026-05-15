import { Navigate, useLocation } from "react-router-dom";

import { canAccessCurrentPath, getDefaultHomeByRole, getUserRole, isAuthenticated } from "../services/auth";

export default function ProtectedRoute({ children, allowedRoles }) {
  const location = useLocation();

  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  const role = getUserRole();
  if (Array.isArray(allowedRoles) && allowedRoles.length > 0 && !allowedRoles.includes(role)) {
    return <Navigate to={getDefaultHomeByRole(role)} replace />;
  }

  if (!canAccessCurrentPath(location.pathname)) {
    return <Navigate to={getDefaultHomeByRole(role)} replace />;
  }

  return children;
}
