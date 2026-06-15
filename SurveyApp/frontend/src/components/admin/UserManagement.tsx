import React, { useEffect, useState } from "react";
import { Trash2, Shield, ShieldOff, UserPlus, X, Edit2, Check } from "lucide-react";
import api from "../../services/api";
import type { User, UserRole } from "../../types";
import { LoadingSpinner } from "../common/LoadingSpinner";

interface BulkCreateResult {
  created: User[];
  skipped: { email: string; reason: string }[];
  errors: { email: string; reason: string }[];
  summary: {
    created_count: number;
    skipped_count: number;
    error_count: number;
  };
}

export const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Name editing state
  const [editingNameId, setEditingNameId] = useState<string | null>(null);
  const [tempName, setTempName] = useState("");

  // Add users modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [emailsInput, setEmailsInput] = useState("");
  const [newUserRole, setNewUserRole] = useState<UserRole>("viewer");
  const [addingUsers, setAddingUsers] = useState(false);
  const [bulkResult, setBulkResult] = useState<BulkCreateResult | null>(null);

  const fetchUsers = async () => {
    try {
      const { data } = await api.get("/users");
      setUsers(data);
    } catch (err) {
      console.error("Failed to fetch users", err);
      setError("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    setActionLoading(userId);
    try {
      const { data } = await api.put(`/users/${userId}/role`, {
        role: newRole,
      });
      setUsers(users.map((u) => (u.id === userId ? data : u)));
    } catch (err: any) {
      console.error("Failed to update role", err);
      setError(err.response?.data?.error || "Failed to update role");
    } finally {
      setActionLoading(null);
    }
  };

  const handleAccessToggle = async (
    userId: string,
    currentlyActive: boolean
  ) => {
    setActionLoading(userId);
    try {
      const { data } = await api.put(`/users/${userId}/access`, {
        is_active: !currentlyActive,
      });
      setUsers(users.map((u) => (u.id === userId ? data : u)));
    } catch (err: any) {
      console.error("Failed to toggle access", err);
      setError(err.response?.data?.error || "Failed to toggle access");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (userId: string, email: string) => {
    if (
      !window.confirm(
        `Are you sure you want to delete ${email}? This action cannot be undone.`
      )
    ) {
      return;
    }

    setActionLoading(userId);
    try {
      await api.delete(`/users/${userId}`);
      setUsers(users.filter((u) => u.id !== userId));
    } catch (err: any) {
      console.error("Failed to delete user", err);
      setError(err.response?.data?.error || "Failed to delete user");
    } finally {
      setActionLoading(null);
    }
  };

  const startEditingName = (user: User) => {
    setEditingNameId(user.id);
    setTempName(user.name || "");
  };

  const saveNameEdit = async (userId: string) => {
    if (!tempName.trim()) {
      cancelNameEdit();
      return;
    }
    setActionLoading(userId);
    try {
      const { data } = await api.put(`/users/${userId}/name`, {
        name: tempName.trim(),
      });
      setUsers(users.map((u) => (u.id === userId ? data : u)));
      setEditingNameId(null);
    } catch (err: any) {
      console.error("Failed to update name", err);
      setError(err.response?.data?.error || "Failed to update name");
    } finally {
      setActionLoading(null);
    }
  };

  const cancelNameEdit = () => {
    setEditingNameId(null);
    setTempName("");
  };

  const handleAddUsers = async () => {
    // Parse emails - split by comma, semicolon, newline, or space
    const emails = emailsInput
      .split(/[,;\n\s]+/)
      .map((e) => e.trim())
      .filter((e) => e.length > 0);

    if (emails.length === 0) {
      setError("Please enter at least one email address");
      return;
    }

    setAddingUsers(true);
    setError("");
    setBulkResult(null);

    try {
      const { data } = await api.post("/users/bulk", {
        emails,
        role: newUserRole,
      });
      setBulkResult(data);

      // Add newly created users to the list
      if (data.created.length > 0) {
        setUsers((prev) => [...prev, ...data.created]);
        setSuccess(`Successfully added ${data.created.length} user(s)`);
      }

      // Clear input if all succeeded
      if (data.errors.length === 0 && data.skipped.length === 0) {
        setEmailsInput("");
        setTimeout(() => {
          setShowAddModal(false);
          setBulkResult(null);
        }, 2000);
      }
    } catch (err: any) {
      console.error("Failed to add users", err);
      setError(err.response?.data?.error || "Failed to add users");
    } finally {
      setAddingUsers(false);
    }
  };

  const closeModal = () => {
    setShowAddModal(false);
    setEmailsInput("");
    setNewUserRole("viewer");
    setBulkResult(null);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "Never";
    return new Date(dateString).toLocaleString();
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          User Management
        </h1>
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors"
        >
          <UserPlus className="w-5 h-5 mr-2" />
          Add Users
        </button>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-200 p-3 rounded-md text-sm">
          {error}
          <button onClick={() => setError("")} className="ml-2 underline">
            Dismiss
          </button>
        </div>
      )}

      {success && (
        <div className="bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-200 p-3 rounded-md text-sm">
          {success}
          <button onClick={() => setSuccess("")} className="ml-2 underline">
            Dismiss
          </button>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                User
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Role
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Last Active
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Access
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {users.map((user) => (
              <tr key={user.id} className={!user.is_active ? "opacity-50" : ""}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    {user.profile_picture_url ? (
                      <img
                        className="h-8 w-8 rounded-full"
                        src={user.profile_picture_url}
                        alt=""
                      />
                    ) : (
                      <div className="h-8 w-8 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
                        <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                          {user.email[0].toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div className="ml-4">
                      <div className="flex items-center gap-1">
                        {editingNameId === user.id ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={tempName}
                              onChange={(e) => setTempName(e.target.value)}
                              className="px-2 py-1 text-sm border border-primary rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary"
                              autoFocus
                              placeholder="Enter display name"
                              onKeyDown={(e) => {
                                if (e.key === "Enter") saveNameEdit(user.id);
                                if (e.key === "Escape") cancelNameEdit();
                              }}
                              onBlur={() => saveNameEdit(user.id)}
                            />
                            <button
                              onClick={() => saveNameEdit(user.id)}
                              className="text-green-600 hover:text-green-700"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => cancelNameEdit()}
                              className="text-red-600 hover:text-red-700"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <>
                            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              {user.name || (
                                <span className="text-gray-400 dark:text-gray-500 italic">
                                  No name set
                                </span>
                              )}
                            </span>
                            <button
                              onClick={() => startEditingName(user)}
                              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                              title="Edit display name"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {user.email}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <select
                    value={user.role}
                    onChange={(e) =>
                      handleRoleChange(user.id, e.target.value as UserRole)
                    }
                    disabled={actionLoading === user.id}
                    className="text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-2 py-1 focus:ring-primary focus:border-primary disabled:opacity-50"
                  >
                    <option value="admin">Admin</option>
                    <option value="facilitator">Facilitator</option>
                    <option value="viewer">Viewer</option>
                  </select>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  {formatDate(user.last_login_at)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <button
                    onClick={() => handleAccessToggle(user.id, user.is_active)}
                    disabled={actionLoading === user.id}
                    className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                      user.is_active
                        ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/50"
                        : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/50"
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {user.is_active ? (
                      <>
                        <Shield className="w-4 h-4 mr-1" />
                        Active
                      </>
                    ) : (
                      <>
                        <ShieldOff className="w-4 h-4 mr-1" />
                        Disabled
                      </>
                    )}
                  </button>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <button
                    onClick={() => handleDelete(user.id, user.email)}
                    disabled={actionLoading === user.id}
                    className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Delete user"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-6 py-8 text-center text-gray-500 dark:text-gray-400"
                >
                  No users found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add Users Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-lg w-full mx-4">
            <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Add Users
              </h2>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email Addresses
                </label>
                <textarea
                  value={emailsInput}
                  onChange={(e) => setEmailsInput(e.target.value)}
                  rows={5}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2 focus:ring-primary focus:border-primary"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Separate multiple emails with commas, semicolons, spaces, or
                  new lines
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Default Role
                </label>
                <select
                  value={newUserRole}
                  onChange={(e) => setNewUserRole(e.target.value as UserRole)}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2 focus:ring-primary focus:border-primary"
                >
                  <option value="viewer">Viewer</option>
                  <option value="facilitator">Facilitator</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              {/* Results */}
              {bulkResult && (
                <div className="space-y-2">
                  {bulkResult.summary.created_count > 0 && (
                    <div className="bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-200 p-2 rounded text-sm">
                      Created {bulkResult.summary.created_count} user(s)
                    </div>
                  )}
                  {bulkResult.skipped.length > 0 && (
                    <div className="bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-200 p-2 rounded text-sm">
                      <div className="font-medium">
                        Skipped {bulkResult.skipped.length}:
                      </div>
                      <ul className="list-disc list-inside">
                        {bulkResult.skipped.map((s, i) => (
                          <li key={i}>
                            {s.email} - {s.reason}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {bulkResult.errors.length > 0 && (
                    <div className="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-200 p-2 rounded text-sm">
                      <div className="font-medium">
                        Errors {bulkResult.errors.length}:
                      </div>
                      <ul className="list-disc list-inside">
                        {bulkResult.errors.map((e, i) => (
                          <li key={i}>
                            {e.email} - {e.reason}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 p-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={closeModal}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddUsers}
                disabled={addingUsers || !emailsInput.trim()}
                className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {addingUsers ? "Adding..." : "Add Users"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
