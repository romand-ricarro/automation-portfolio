import type { ReactNode } from 'react';
import { useAuth } from '../hooks/useAuth';
import type { UserRole } from '../context/AuthContext';
import { LoginPage } from '../pages/Login';
import { LoadingPage } from './Loading';
import { AlertTriangle } from 'lucide-react';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRoles?: UserRole[];
}

export function ProtectedRoute({ children, requiredRoles }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user, hasRole } = useAuth();

  // Show loading while checking auth
  if (isLoading) {
    return <LoadingPage />;
  }

  // Show login page if not authenticated
  if (!isAuthenticated) {
    return <LoginPage />;
  }

  // Check role requirements if specified
  if (requiredRoles && requiredRoles.length > 0 && !hasRole(requiredRoles)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
        <div className="max-w-md w-full text-center">
          <div className="mx-auto w-16 h-16 flex items-center justify-center rounded-full bg-yellow-100 dark:bg-yellow-900/30 mb-6">
            <AlertTriangle className="w-8 h-8 text-yellow-600 dark:text-yellow-400" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Access Denied
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-2">
            You don't have permission to access this page.
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-500">
            Required role: {requiredRoles.join(' or ')}
            <br />
            Your role: {user?.role || 'unknown'}
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
