import { Navigate } from "react-router-dom";

import { getDefaultHomeByRole, getUserRole, isAuthenticated } from "../services/auth";

export default function ProtectedRoute({ children, allowedRoles }) {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  const role = getUserRole();
  if (Array.isArray(allowedRoles) && allowedRoles.length > 0 && !allowedRoles.includes(role)) {
    return <Navigate to={getDefaultHomeByRole(role)} replace />;
  }

  return children;
}
