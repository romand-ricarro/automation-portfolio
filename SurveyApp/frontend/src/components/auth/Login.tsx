import React, { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { LoadingSpinner } from "../common/LoadingSpinner";

export const Login: React.FC = () => {
  const { user, signInWithGoogle, loading, authError } = useAuth();
  const [error, setError] = useState("");

  if (loading) return <LoadingSpinner className="h-screen" />;
  if (user) return <Navigate to="/" replace />;

  // Combine local error with auth error from context
  const displayError = error || authError;

  const handleLogin = async () => {
    try {
      setError(""); // Clear previous errors
      console.log("Starting Google OAuth...");
      await signInWithGoogle();
      console.log("OAuth initiated successfully");
    } catch (err: any) {
      console.error("OAuth error:", err);
      setError(err.message || "Failed to sign in");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 transition-colors">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-gray-100">
          InsightPulse
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
          Sign in to access your dashboard
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white dark:bg-gray-800 py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {displayError && (
            <div className="mb-4 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-200 p-3 rounded-md text-sm">
              {displayError}
            </div>
          )}

          <div>
            <button
              onClick={handleLogin}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors"
            >
              Sign in with Google
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
