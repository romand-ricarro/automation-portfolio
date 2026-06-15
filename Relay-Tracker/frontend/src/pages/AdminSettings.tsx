import { useState, useEffect, useCallback } from "react";
import {
  Users,
  Shield,
  Search,
  RefreshCw,
  ChevronDown,
  Check,
  Loader2,
} from "lucide-react";
import { MainLayout, showToast } from "../components";
import { useAuth } from "../hooks/useAuth";
import { fetchUsers, updateUserRole } from "../lib/api";
import type { AuthUser, UserRole } from "../context/auth-context";

function RoleBadge({ role }: { role: string }) {
  const colors = {
    admin: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    sqa: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
    user: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
  };

  return (
    <span
      className={`px-2.5 py-1 text-xs font-medium rounded-full ${
        colors[role as keyof typeof colors] || colors.user
      }`}
    >
      {role.charAt(0).toUpperCase() + role.slice(1)}
    </span>
  );
}

interface RoleDropdownProps {
  currentRole: UserRole;
  userId: string;
  disabled?: boolean;
  onRoleChange: (userId: string, newRole: UserRole) => Promise<void>;
}

function RoleDropdown({
  currentRole,
  userId,
  disabled,
  onRoleChange,
}: RoleDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const roles: UserRole[] = ["user", "sqa", "admin"];

  const handleSelect = async (role: UserRole) => {
    if (role === currentRole) {
      setIsOpen(false);
      return;
    }

    setIsUpdating(true);
    try {
      await onRoleChange(userId, role);
    } finally {
      setIsUpdating(false);
      setIsOpen(false);
    }
  };

  const roleLabels = {
    user: "User",
    sqa: "SQA",
    admin: "Admin",
  };

  const roleDescriptions = {
    user: "Can report issues and view their own submissions",
    sqa: "Can triage and manage all issues",
    admin: "Full system access including user management",
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled || isUpdating}
        className="flex items-center gap-2 px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isUpdating ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <>
            <span>{roleLabels[currentRole]}</span>
            <ChevronDown
              className={`w-4 h-4 transition-transform ${
                isOpen ? "rotate-180" : ""
              }`}
            />
          </>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1 w-64 py-1 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 z-10">
          {roles.map((role) => (
            <button
              key={role}
              onClick={() => handleSelect(role)}
              className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {roleLabels[role]}
                  </span>
                  {role === currentRole && (
                    <Check className="w-4 h-4 text-green-500" />
                  )}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {roleDescriptions[role]}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function AdminSettingsPage() {
  const { user: currentUser, hasRole } = useAuth();
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<AuthUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const loadUsers = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await fetchUsers();
      setUsers(data);
      setFilteredUsers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load users");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredUsers(users);
      return;
    }

    const query = searchQuery.toLowerCase();
    setFilteredUsers(
      users.filter(
        (u) =>
          u.name?.toLowerCase().includes(query) ||
          u.email.toLowerCase().includes(query) ||
          u.role.toLowerCase().includes(query)
      )
    );
  }, [searchQuery, users]);

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    try {
      await updateUserRole(userId, newRole);

      // Update local state
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
      );

      const updatedUser = users.find((u) => u.id === userId);
      showToast({
        type: "success",
        title: "Role updated",
        message: `${updatedUser?.name || "User"} is now a ${newRole}`,
      });
    } catch (err) {
      showToast({
        type: "error",
        title: "Failed to update role",
        message:
          err instanceof Error ? err.message : "Could not update user role",
      });
      throw err;
    }
  };

  // Redirect non-admins
  if (!hasRole("admin")) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <Shield className="w-16 h-16 text-gray-400 mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Access Denied
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            You don't have permission to access this page.
          </p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-relay-gradient">
              <Users className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              User Management
            </h1>
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            Manage user roles and permissions
          </p>
        </div>

        {/* Search and Refresh */}
        <div className="flex items-center gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, email, or role..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-relay-orange/50 focus:border-relay-orange"
            />
          </div>
          <button
            onClick={loadUsers}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            <RefreshCw
              className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`}
            />
            Refresh
          </button>
        </div>

        {/* Error state */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            <button
              onClick={loadUsers}
              className="mt-2 text-sm font-medium text-red-600 dark:text-red-400 hover:underline"
            >
              Try again
            </button>
          </div>
        )}

        {/* Users table */}
        <div className="glassmorphism dark:glassmorphism-dark rounded-2xl overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-relay-orange" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 dark:text-gray-400">
                {searchQuery ? "No users match your search" : "No users found"}
              </p>
            </div>
          ) : (
            <>
              {/* Mobile card view */}
              <div className="md:hidden divide-y divide-gray-200 dark:divide-gray-700">
                {Array.isArray(filteredUsers) &&
                  filteredUsers.map((u) => (
                    <div
                      key={u.id}
                      className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        {/* Avatar */}
                        {u.avatar_url ? (
                          <img
                            src={u.avatar_url}
                            alt={u.name}
                            className="w-10 h-10 rounded-full flex-shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-relay-gradient flex items-center justify-center flex-shrink-0">
                            <span className="text-sm font-medium text-white">
                              {u.name?.charAt(0)?.toUpperCase() ||
                                u.email.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}

                        {/* User info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                              {u.name || "Unknown"}
                            </p>
                            <RoleBadge role={u.role} />
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate mb-3">
                            {u.email}
                          </p>

                          {/* Role dropdown */}
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              Change role:
                            </span>
                            <RoleDropdown
                              currentRole={u.role}
                              userId={u.id}
                              disabled={u.id === currentUser?.id}
                              onRoleChange={handleRoleChange}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>

              {/* Desktop table view */}
              <table className="w-full hidden md:table">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Current Role
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {Array.isArray(filteredUsers) &&
                    filteredUsers.map((u) => (
                      <tr
                        key={u.id}
                        className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            {u.avatar_url ? (
                              <img
                                src={u.avatar_url}
                                alt={u.name}
                                className="w-10 h-10 rounded-full"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-relay-gradient flex items-center justify-center">
                                <span className="text-sm font-medium text-white">
                                  {u.name?.charAt(0)?.toUpperCase() ||
                                    u.email.charAt(0).toUpperCase()}
                                </span>
                              </div>
                            )}
                            <div>
                              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                {u.name || "Unknown"}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {u.email}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <RoleBadge role={u.role} />
                        </td>
                        <td className="px-6 py-4 text-right">
                          <RoleDropdown
                            currentRole={u.role}
                            userId={u.id}
                            disabled={u.id === currentUser?.id}
                            onRoleChange={handleRoleChange}
                          />
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </>
          )}
        </div>

        {/* Info */}
        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
          <p className="text-sm text-blue-700 dark:text-blue-300">
            <strong>Note:</strong> You cannot change your own role. Changes take
            effect immediately.
          </p>
        </div>
      </div>
    </MainLayout>
  );
}
