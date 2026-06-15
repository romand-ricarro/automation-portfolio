import { useEffect, useState, useCallback, type ReactNode } from "react";
import {
  AuthContext,
  type AuthUser,
  type AuthContextType,
  type UserPreferences,
  type UserRole,
} from "./auth-context";

// Re-export types for convenience
export type {
  UserRole,
  UserPreferences,
  AuthUser,
  AuthContextType,
} from "./auth-context";
export { AuthContext } from "./auth-context";

// API URL: empty string = same origin (production), set VITE_API_URL for local dev
const API_URL = import.meta.env.VITE_API_URL ?? "";
const TOKEN_STORAGE_KEY = "relay_id_token";

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [idToken, setIdToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  // Fetch user details from our API
  const fetchUserDetails = useCallback(
    async (token: string): Promise<AuthUser | null> => {
      const response = await fetch(`${API_URL}/api/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        localStorage.removeItem(TOKEN_STORAGE_KEY);

        // Try to get error message from response
        let errorMessage = "Failed to authenticate";
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch {
          // JSON parsing failed, use default message
        }

        throw new Error(errorMessage);
      }

      return await response.json();
    },
    []
  );

  // Initialize auth state from stored token
  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem(TOKEN_STORAGE_KEY);

      if (storedToken) {
        try {
          const userDetails = await fetchUserDetails(storedToken);
          if (userDetails) {
            setIdToken(storedToken);
            setUser(userDetails);
          } else {
            // Token was invalid, clear it
            localStorage.removeItem(TOKEN_STORAGE_KEY);
          }
        } catch (error) {
          // Token was invalid or user not authorized, clear it
          console.error("Auth initialization error:", error);
          localStorage.removeItem(TOKEN_STORAGE_KEY);
          // Store the error message if it's an authorization error
          const errorMessage = error instanceof Error ? error.message : "Authentication failed";
          if (errorMessage.toLowerCase().includes("not authorized") ||
              errorMessage.toLowerCase().includes("not allowed")) {
            setAuthError(errorMessage);
          }
        }
      }

      setIsLoading(false);
    };

    initAuth();
  }, [fetchUserDetails]);

  // Sign in with Google credential (called from GoogleLogin component)
  // Note: We don't set isLoading here because LoginPage has its own loading state (isSigningIn).
  // Setting isLoading would cause ProtectedRoute to unmount LoginPage during sign-in,
  // which loses the error state when sign-in fails.
  const signIn = useCallback(
    async (credential: string) => {
      try {
        // Store the token temporarily
        localStorage.setItem(TOKEN_STORAGE_KEY, credential);
        setIdToken(credential);

        // Fetch user details from our API
        const userDetails = await fetchUserDetails(credential);

        if (userDetails) {
          setUser(userDetails);
        } else {
          // Failed to get user details, clear the token
          localStorage.removeItem(TOKEN_STORAGE_KEY);
          setIdToken(null);
          throw new Error("Failed to authenticate");
        }
      } catch (error) {
        // Clear the token on any error
        localStorage.removeItem(TOKEN_STORAGE_KEY);
        setIdToken(null);
        setUser(null);
        // Store the error for display on login page
        const errorMessage = error instanceof Error ? error.message : "Authentication failed";
        setAuthError(errorMessage);
        // Re-throw to be caught by LoginPage
        throw error;
      }
    },
    [fetchUserDetails]
  );

  const loginAsGuest = useCallback(() => {
    const mockToken = "dev-token-secret";
    const mockUser: AuthUser = {
      id: "dev-admin-123",
      email: "dev-admin@relay.local",
      name: "Dev Admin",
      avatar_url: "https://ui-avatars.com/api/?name=Dev+Admin",
      role: "admin",
      preferences: {
        email_notifications: true,
        discord_notifications: true,
        theme: "dark",
      },
    };

    localStorage.setItem(TOKEN_STORAGE_KEY, mockToken);
    setIdToken(mockToken);
    setUser(mockUser);
  }, []);

  const signOut = useCallback(async () => {
    // Call our API to log the logout
    if (idToken) {
      try {
        await fetch(`${API_URL}/api/auth/logout`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
        });
      } catch (error) {
        console.error("Error logging logout:", error);
      }
    }

    // Clear local state and storage
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    // Reset workspace to default on logout
    localStorage.removeItem("relay_active_workspace");
    setUser(null);
    setIdToken(null);
  }, [idToken]);

  const refreshUser = useCallback(async () => {
    if (!idToken) return;

    const userDetails = await fetchUserDetails(idToken);
    if (userDetails) {
      setUser(userDetails);
    }
  }, [idToken, fetchUserDetails]);

  const updatePreferences = useCallback(
    async (preferences: Partial<UserPreferences>) => {
      if (!idToken) {
        throw new Error("Not authenticated");
      }

      const response = await fetch(`${API_URL}/api/auth/preferences`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${idToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(preferences),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update preferences");
      }

      // Refresh user to get updated preferences
      await refreshUser();
    },
    [idToken, refreshUser]
  );

  const hasRole = useCallback(
    (roles: UserRole | UserRole[]) => {
      if (!user) return false;
      const roleArray = Array.isArray(roles) ? roles : [roles];
      return roleArray.includes(user.role);
    },
    [user]
  );

  // Theme Watcher: Apply 'dark' class based on user preferences or system
  useEffect(() => {
    const applyTheme = () => {
      const theme = user?.preferences?.theme || "system";
      const root = window.document.documentElement;

      if (theme === "dark") {
        root.classList.add("dark");
      } else if (theme === "light") {
        root.classList.remove("dark");
      } else {
        // System preference
        const isDark = window.matchMedia(
          "(prefers-color-scheme: dark)"
        ).matches;
        if (isDark) {
          root.classList.add("dark");
        } else {
          root.classList.remove("dark");
        }
      }
    };

    applyTheme();

    // Listen for system theme changes if set to system
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleSystemChange = () => {
      if ((user?.preferences?.theme || "system") === "system") {
        applyTheme();
      }
    };

    mediaQuery.addEventListener("change", handleSystemChange);
    return () => mediaQuery.removeEventListener("change", handleSystemChange);
  }, [user?.preferences?.theme]);

  const clearAuthError = useCallback(() => {
    setAuthError(null);
  }, []);

  const value: AuthContextType = {
    user,
    idToken,
    isLoading,
    isAuthenticated: !!user && !!idToken,
    authError,
    clearAuthError,
    signIn,
    loginAsGuest,
    signOut,
    refreshUser,
    updatePreferences,
    hasRole,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
