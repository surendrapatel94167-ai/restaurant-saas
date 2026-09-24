import { useSelector } from 'react-redux';
import { Navigate, Outlet } from 'react-router-dom';

// Works both as a wrapper (<ProtectedRoute><Page/></ProtectedRoute>) and as a
// layout route (<Route element={<ProtectedRoute allowedRoles={[...]} />}>...</Route>)
// — falls back to rendering an <Outlet/> when no children are passed.
export default function ProtectedRoute({ children, allowedRoles }) {
  const { token, user } = useSelector((s) => s.auth);
  if (!token) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user?.role)) return <Navigate to="/" replace />;
  return children ?? <Outlet />;
}
