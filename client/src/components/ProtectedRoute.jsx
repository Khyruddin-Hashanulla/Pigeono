import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { LoadingState } from './States'

export default function ProtectedRoute({ children, requireVendor = false, requireAdmin = false }) {
  const { user, loading, isVendor, isAdmin } = useAuth()
  const location = useLocation()

  if (loading) return <LoadingState label="Checking your session..." />
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />
  if (requireVendor && !isVendor) return <Navigate to="/become-vendor" replace />
  if (requireAdmin && !isAdmin) return <Navigate to="/" replace />
  return children
}
