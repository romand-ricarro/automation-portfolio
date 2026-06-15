import { createContext } from "react";

export type UserRole = "user" | "sqa" | "admin";

export interface UserPreferences {
  email_notifications: boolean;
  discord_notifications: boolean;
  theme: "light" | "dark" | "system";
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
  role: UserRole;
  preferences?: UserPreferences;
}

export interface AuthContextType {
  user: AuthUser | null;
  idToken: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  authError: string | null;
  clearAuthError: () => void;
  signIn: (credential: string) => Promise<void>;
  loginAsGuest: () => void;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updatePreferences: (preferences: Partial<UserPreferences>) => Promise<void>;
  hasRole: (roles: UserRole | UserRole[]) => boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(
  undefined
);
