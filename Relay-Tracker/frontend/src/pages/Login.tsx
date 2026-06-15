import { useState } from "react";
import { GoogleLogin, type CredentialResponse } from "@react-oauth/google";
import { Radio, AlertCircle, ShieldX } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { LoadingSpinner } from "../components/Loading";

export function LoginPage() {
  const { signIn, loginAsGuest, authError, clearAuthError } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);

  // Combine local error and context authError
  const displayError = error || authError;
  const isWhitelistError = displayError
    ? displayError.toLowerCase().includes("not authorized") ||
      displayError.toLowerCase().includes("whitelist") ||
      displayError.toLowerCase().includes("not allowed")
    : false;

  const handleSuccess = async (response: CredentialResponse) => {
    // Clear errors at start of new attempt
    setError(null);
    clearAuthError();

    if (!response.credential) {
      setError("No credential received from Google");
      return;
    }

    setIsSigningIn(true);
    try {
      await signIn(response.credential);
      // Success - redirect to dashboard for a clean start
      window.history.replaceState({}, "", "/");
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to sign in";
      setError(errorMessage);
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleError = () => {
    setError("Google sign-in failed. Please try again.");
  };

  if (isSigningIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-relay-gradient rounded-full opacity-20 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-relay-gradient rounded-full opacity-20 blur-3xl" />
      </div>

      {/* Login card */}
      <div className="relative w-full max-w-md">
        <div className="glassmorphism dark:glassmorphism-dark rounded-2xl p-8 shadow-2xl">
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-relay-gradient shadow-lg mb-4">
              <Radio className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-relay-gradient">Relay</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2 text-center">
              Fast track from report to resolution
            </p>
          </div>

          {/* Error message */}
          {displayError && (
            <div
              className={`mb-6 p-4 rounded-lg flex items-start gap-3 ${
                isWhitelistError
                  ? "bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800"
                  : "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
              }`}
            >
              {isWhitelistError ? (
                <ShieldX className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              )}
              <div>
                <p
                  className={`text-sm ${
                    isWhitelistError
                      ? "text-amber-700 dark:text-amber-300"
                      : "text-red-600 dark:text-red-400"
                  }`}
                >
                  {displayError}
                </p>
                {isWhitelistError && !displayError.toLowerCase().includes("contact") && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                    Please contact your administrator to request access.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Google Sign in button */}
          <div className="flex flex-col items-center gap-4">
            <GoogleLogin
              onSuccess={handleSuccess}
              onError={handleError}
              useOneTap
              use_fedcm_for_prompt={false}
              theme="outline"
              size="large"
              width="320"
              text="signin_with"
              shape="rectangular"
            />

            {(import.meta.env.MODE === "development" ||
              import.meta.env.VITE_APP_ENV === "staging") && (
              <button
                onClick={loginAsGuest}
                className="text-xs text-gray-400 hover:text-relay-orange transition-colors underline decoration-dotted underline-offset-4"
              >
                {import.meta.env.VITE_APP_ENV === "staging"
                  ? "Staging: Mock Login"
                  : "Dev: Bypass Google Login"}
              </button>
            )}
          </div>

          {/* Footer text */}
          <p className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
            By signing in, you agree to access Relay with your company
            credentials.
          </p>
        </div>
      </div>
    </div>
  );
}
